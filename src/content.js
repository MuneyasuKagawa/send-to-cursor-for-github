/**
 * GitHub の PR / Issue ページに、Cursor を開くボタンを差し込む。
 *
 * どの対象にボタンを付けるかは src/config.js の TARGETS で定義し、
 * ここでは対象ごとの「挿入先の探し方」と「テンプレートに渡す値」だけを担当する。
 */
(function (ns) {
  const BUTTON_CLASS = 'ghcl-button';
  const ICON_ONLY_CLASS = 'ghcl-button--icon-only';
  const HEADER_CLASS = 'ghcl-button--header';
  const CHECK_CLASS = 'ghcl-button--check';
  const REACTION_CLASS = 'ghcl-button--reaction';
  // ターミナルのプロンプト記号 "❯_" 相当のアイコン
  const ICON_PATH =
    'M4 3 L9 8 L4 13 L2.5 11.5 L6 8 L2.5 4.5 Z M8.5 11 H14 V13 H8.5 Z';
  // コピー完了の合図に使うチェックマーク（octicon check-16）
  const CHECK_ICON_PATH =
    'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z';
  const FEEDBACK_MS = 1500;

  // 新しい Issue UI の絵文字リアクションボタン。クラス名は CSS モジュールの生成物。
  const REACTION_ANCHOR_SELECTOR =
    'button[class*="ReactionViewerAnchor-module__ReactionViewerAnchorButton"]';

  const PR_HEADER_SELECTORS = [
    '.gh-header-actions',
    // Primer React 製の新しい PR ヘッダー。View status / Code のボタンが入る列。
    '[data-component="PH_Actions"]',
    '[data-testid="pr-header-actions"]',
    '.gh-header-meta',
  ];

  let settings = { ...ns.DEFAULTS };
  const promptByButton = new WeakMap();
  const feedbackTimerByButton = new WeakMap();

  function labelText() {
    return settings.buttonLabel || ns.DEFAULTS.buttonLabel;
  }

  /**
   * 表示されている最初の要素を返す。
   * 新しい PR ヘッダーのボタン列は、権限が無いときなど中身が空だと d-none で隠れており、
   * そこに入れてもボタンが見えないため、隠れているものは飛ばす。
   */
  function firstMatch(selectors) {
    for (const selector of selectors) {
      for (const found of document.querySelectorAll(selector)) {
        if (found.getClientRects().length) return found;
      }
    }
    return null;
  }

  function tooltipText(tooltip, truncated) {
    return [
      truncated ? ns.t('tooltip.truncated', { tooltip }) : tooltip,
      ns.t('tooltip.shiftToCopy'),
    ].join('\n');
  }

  function applyPrompt(anchor, { url, prompt, truncated, tooltip }) {
    anchor.href = url;
    anchor.title = tooltipText(tooltip, truncated);
    promptByButton.set(anchor, prompt);
  }

  function createButton({ url, prompt, truncated, tooltip }) {
    const anchor = document.createElement('a');
    anchor.className = BUTTON_CLASS;
    anchor.href = url;
    anchor.setAttribute('role', 'button');
    if (settings.linkMode === 'web') {
      // cursor.com 経由のときは GitHub のタブを離れないように別タブで開く
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    anchor.title = tooltipText(tooltip, truncated);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICON_PATH);
    svg.appendChild(path);
    anchor.appendChild(svg);

    if (settings.showLabel === false) {
      anchor.classList.add(ICON_ONLY_CLASS);
      // ラベルが無いと SVG は aria-hidden なので読み上げ用の名前が消える
      anchor.setAttribute('aria-label', labelText());
    } else {
      const label = document.createElement('span');
      label.textContent = labelText();
      anchor.appendChild(label);
    }

    promptByButton.set(anchor, prompt);
    anchor.addEventListener('click', onClick);
    return anchor;
  }

  /** ラベルがあれば文字で、アイコンのみならチェックマークでコピー完了を知らせる */
  function showCopied(anchor) {
    const label = anchor.querySelector('span');
    const path = anchor.querySelector('svg path');
    clearTimeout(feedbackTimerByButton.get(anchor));

    if (label) {
      label.textContent = ns.t('button.copied');
    } else {
      path.setAttribute('d', CHECK_ICON_PATH);
    }

    feedbackTimerByButton.set(
      anchor,
      setTimeout(() => {
        if (label) {
          label.textContent = labelText();
        } else {
          path.setAttribute('d', ICON_PATH);
        }
      }, FEEDBACK_MS),
    );
  }

  async function onClick(event) {
    if (!event.shiftKey) return;
    event.preventDefault();
    const anchor = event.currentTarget;
    const prompt = promptByButton.get(anchor);
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      showCopied(anchor);
    } catch {
      // クリップボードが使えない場合は何もしない（通常のクリックでの遷移は動作する）
    }
  }

  /** body は cleanCommentBody を通したもの。空でもよい対象（PR 全体 / CI）があるので判定は呼び出し側で行う。 */
  function build(targetId, values, body) {
    const built = ns.buildPromptDeeplink({
      template: ns.templateFor(settings, targetId),
      values,
      body,
      bodyKey: ns.getTarget(targetId).bodyKey,
      linkMode: settings.linkMode,
      urlLimit: ns.URL_LIMIT,
    });
    return { ...built, tooltip: ns.targetTooltip(targetId) };
  }

  function enabled(targetId) {
    return ns.isTargetEnabled(settings, targetId);
  }

  /**
   * 新しい PR UI では本文の Markdown 原文が遅延読み込みで、挿入時点では描画済み HTML の
   * テキストしか手に入らない。ボタンに触れた時点で原文を読み込ませ、届いたら差し替える。
   * 間に合わなかった場合も代用テキストのプロンプトで動く。
   */
  function upgradeBodyOnHover(button, root, rebuild) {
    if (ns.hasRawMarkdown(root)) return;

    const run = async () => {
      button.removeEventListener('mouseenter', run);
      button.removeEventListener('focus', run);
      const raw = await ns.loadRawMarkdown(root);
      const body = ns.cleanCommentBody(raw);
      if (body) applyPrompt(button, rebuild(body));
    };
    button.addEventListener('mouseenter', run);
    button.addEventListener('focus', run);
  }

  /**
   * リアクション行の末尾に入れる。付いている絵文字リアクションの右隣になる。
   * リアクションは後から描画されることがあるので、印を付けて位置を維持する。
   */
  function placeInReactionRow(button, row) {
    button.classList.add(REACTION_CLASS);
    row.appendChild(button);
  }

  /**
   * 絵文字リアクションはサーバーが返す HTML に含まれず、後から React が行の末尾へ足す。
   * 挿入した時点では末尾でも、あとからリアクションが増えると絵文字の手前に取り残される。
   * MutationObserver から呼ばれるので、そのたびに末尾へ戻す。
   */
  function keepReactionButtonsLast() {
    for (const button of document.querySelectorAll(`.${REACTION_CLASS}`)) {
      const row = button.parentElement;
      if (row && row.lastElementChild !== button) row.appendChild(button);
    }
  }

  /**
   * コメント 1 件につき 1 箇所だけ、優先度の高い挿入先を渡す。
   * 挿入先が見つからなかったコメントは、次の手段に回る。
   */
  function eachCommentAnchor(visit) {
    const visited = new Set();
    const offer = (root, place) => {
      if (!root || visited.has(root)) return;
      visited.add(root);
      visit(root, place);
    };

    // 1. 絵文字リアクションの行。ヘッダー配置でも下段配置でも同じ位置関係になる。
    for (const menu of document.querySelectorAll('reactions-menu')) {
      const row = menu.closest('.comment-reactions');
      if (row && row.classList.contains('d-none')) continue;
      offer(menu.closest(ns.COMMENT_ROOT_SELECTOR), (button) =>
        row
          ? placeInReactionRow(button, row)
          : menu.insertAdjacentElement('afterend', button),
      );
    }

    // 2. 新しい Issue UI のリアクション。ボタンとツールチップを包む行の末尾に入れる。
    for (const anchor of document.querySelectorAll(REACTION_ANCHOR_SELECTOR)) {
      const row = anchor.parentElement;
      if (!row) continue;
      offer(anchor.closest(ns.COMMENT_ROOT_SELECTOR), (button) =>
        placeInReactionRow(button, row),
      );
    }

    // 3. リアクションボタンが無い（リアクション権限が無いなど）場合はリアクション行の末尾。
    for (const row of document.querySelectorAll('.comment-reactions:not(.d-none)')) {
      if (row.querySelector('reactions-menu')) continue;
      offer(row.closest(ns.COMMENT_ROOT_SELECTOR), (button) =>
        placeInReactionRow(button, row),
      );
    }

    // 4. リアクション行自体が隠れている場合はコメントヘッダーのアクション列。
    for (const actions of document.querySelectorAll('.timeline-comment-actions')) {
      offer(actions.closest(ns.COMMENT_ROOT_SELECTOR), (button) =>
        actions.insertAdjacentElement('afterbegin', button),
      );
    }
  }

  function injectComments(page) {
    // PR の説明文は個別のコメントではなく「PR 全体」の対象として扱う
    const bodyTarget = page.kind === 'issue' ? 'issueBody' : 'prReview';
    const commentTarget = page.kind === 'issue' ? 'issueComment' : 'prComment';

    eachCommentAnchor((root, place) => {
      const targetId = ns.isBodyComment(root) ? bodyTarget : commentTarget;
      if (!targetId || !enabled(targetId)) return;
      if (root.querySelector(`.${BUTTON_CLASS}`)) return;

      const comment = ns.extractComment(root, page);
      if (!comment) return;
      const body = ns.cleanCommentBody(comment.body);
      if (!body) return;

      const rebuild = (nextBody) =>
        build(
          targetId,
          {
            ...page,
            commentUrl: comment.commentUrl,
            author: comment.author,
            filePath: comment.filePath,
            lines: comment.lines,
          },
          nextBody,
        );

      const button = createButton(rebuild(body));
      upgradeBodyOnHover(button, root, rebuild);
      place(button);
    });
  }

  function injectPullRequestReview(page) {
    // 新 UI にはスクロール追従用のヘッダーもあるので、ページ全体で 1 個に絞る
    if (document.querySelector(`.${HEADER_CLASS}`)) return;
    const host = firstMatch(PR_HEADER_SELECTORS);
    if (!host) return;

    const { root, author, body } = ns.extractPullRequestBody();
    const rebuild = (nextBody) => build('prReview', { ...page, author }, nextBody);

    const button = createButton(rebuild(ns.cleanCommentBody(body)));
    button.classList.add(HEADER_CLASS);
    if (root) upgradeBodyOnHover(button, root, rebuild);
    host.appendChild(button);
  }

  function injectCheckFailures(page) {
    for (const check of ns.findFailingChecks()) {
      if (check.row.querySelector(`.${BUTTON_CLASS}`)) continue;

      const button = createButton(
        build(
          'ciFailure',
          { ...page, checkName: check.checkName, checkUrl: check.checkUrl },
          ns.cleanCommentBody(check.failureOutput),
        ),
      );
      button.classList.add(CHECK_CLASS);
      // 新旧どちらの UI でも行の末尾が「Details」やアクションの右隣になる
      check.row.appendChild(button);
    }
  }

  function injectAll() {
    const page = ns.getPageContext();
    if (!page) return;

    keepReactionButtonsLast();

    if (page.kind === 'pull') {
      if (enabled('prReview')) injectPullRequestReview(page);
      if (enabled('ciFailure')) injectCheckFailures(page);
      if (enabled('prComment') || enabled('prReview')) injectComments(page);
      return;
    }

    if (enabled('issueBody') || enabled('issueComment')) injectComments(page);
  }

  let scheduled = false;
  function scheduleInject() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      try {
        injectAll();
      } catch (error) {
        console.error(`[Send to Cursor for GitHub] ${ns.t('log.injectFailed')}`, error);
      }
    }, 150);
  }

  function removeAll() {
    for (const button of document.querySelectorAll(`.${BUTTON_CLASS}`)) {
      button.remove();
    }
  }

  async function start() {
    settings = await ns.loadSettings();
    injectAll();

    new MutationObserver(scheduleInject).observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Turbo によるページ遷移（Conversation ⇄ Files changed など）
    for (const event of ['turbo:load', 'turbo:render', 'pjax:end']) {
      document.addEventListener(event, scheduleInject);
    }

    try {
      chrome.storage.onChanged.addListener(async () => {
        settings = await ns.loadSettings();
        removeAll();
        injectAll();
      });
    } catch {
      // storage が使えない環境では設定変更の追従のみ諦める
    }
  }

  start();
})(GHCursorLink);
