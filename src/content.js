/**
 * PR コメントの絵文字リアクションボタンの右隣に、Cursor を開くボタンを差し込む。
 */
(function (ns) {
  const BUTTON_CLASS = 'ghcl-button';
  // ターミナルのプロンプト記号 "❯_" 相当のアイコン
  const ICON_PATH =
    'M4 3 L9 8 L4 13 L2.5 11.5 L6 8 L2.5 4.5 Z M8.5 11 H14 V13 H8.5 Z';

  let settings = { ...ns.DEFAULTS };
  const promptByButton = new WeakMap();

  function createButton({ url, prompt, truncated }) {
    const anchor = document.createElement('a');
    anchor.className = BUTTON_CLASS;
    anchor.href = url;
    anchor.setAttribute('role', 'button');
    if (settings.linkMode === 'web') {
      // cursor.com 経由のときは GitHub のタブを離れないように別タブで開く
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    anchor.title = truncated
      ? 'Cursor でこのコメントを検証する（本文が長いため一部省略）\nShift+クリックでプロンプトをコピー'
      : 'Cursor でこのコメントを検証する\nShift+クリックでプロンプトをコピー';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', ICON_PATH);
    svg.appendChild(path);
    anchor.appendChild(svg);

    const label = document.createElement('span');
    label.textContent = settings.buttonLabel || 'Cursor';
    anchor.appendChild(label);

    promptByButton.set(anchor, prompt);
    anchor.addEventListener('click', onClick);
    return anchor;
  }

  async function onClick(event) {
    if (!event.shiftKey) return;
    event.preventDefault();
    const anchor = event.currentTarget;
    const prompt = promptByButton.get(anchor);
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      const label = anchor.querySelector('span');
      const original = label.textContent;
      label.textContent = 'コピーしました';
      setTimeout(() => {
        label.textContent = original;
      }, 1500);
    } catch {
      // クリップボードが使えない場合は何もしない（通常のクリックでの遷移は動作する）
    }
  }

  function buildFor(root, prContext) {
    const comment = ns.extractComment(root, prContext);
    if (!comment) return null;

    const body = ns.cleanCommentBody(comment.body);
    if (!body) return null;

    return ns.buildDeeplinkForComment({
      template: settings.promptTemplate || ns.PROMPT_TEMPLATE,
      values: {
        repository: prContext.repository,
        prNumber: prContext.prNumber,
        prTitle: prContext.prTitle,
        prUrl: prContext.prUrl,
        headBranch: prContext.headBranch,
        headLabel: prContext.headLabel,
        baseBranch: prContext.baseBranch,
        commentUrl: comment.commentUrl,
        author: comment.author,
        filePath: comment.filePath,
        lines: comment.lines,
      },
      body,
      linkMode: settings.linkMode,
      urlLimit: ns.URL_LIMIT,
    });
  }

  /** PR 本文（説明欄）にはボタンを出さない */
  function isPullRequestBody(root) {
    return typeof root.id === 'string' && /^issue-\d+$/.test(root.id);
  }

  function insert(root, prContext, place) {
    if (isPullRequestBody(root)) return;
    if (root.querySelector(`.${BUTTON_CLASS}`)) return;

    const built = buildFor(root, prContext);
    if (!built) return;

    place(createButton(built));
  }

  /**
   * 挿入先は上から順に優先される。insert() 側で 1 コメント 1 個に制限しているので、
   * 先の手段で入ったコメントは後続の手段では無視される。
   */
  function injectAll() {
    const prContext = ns.getPullRequestContext();
    if (!prContext) return;

    // 1. 絵文字リアクションボタンの直後。ヘッダー配置でも下段配置でも同じ位置関係になる。
    for (const menu of document.querySelectorAll('reactions-menu')) {
      const row = menu.closest('.comment-reactions');
      if (row && row.classList.contains('d-none')) continue;
      const root = menu.closest(ns.COMMENT_ROOT_SELECTOR);
      if (!root) continue;
      insert(root, prContext, (button) => menu.insertAdjacentElement('afterend', button));
    }

    // 2. リアクションボタンが無い（リアクション権限が無いなど）場合はリアクション行の末尾。
    for (const row of document.querySelectorAll('.comment-reactions:not(.d-none)')) {
      if (row.querySelector('reactions-menu')) continue;
      const root = row.closest(ns.COMMENT_ROOT_SELECTOR);
      if (!root) continue;
      insert(root, prContext, (button) => row.appendChild(button));
    }

    // 3. リアクション行自体が隠れている場合はコメントヘッダーのアクション列。
    for (const actions of document.querySelectorAll('.timeline-comment-actions')) {
      const root = actions.closest(ns.COMMENT_ROOT_SELECTOR);
      if (!root) continue;
      insert(root, prContext, (button) => actions.insertAdjacentElement('afterbegin', button));
    }
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
        console.error('[GitHub Cursor Link] ボタンの挿入に失敗しました', error);
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
