/**
 * GitHub の PR / Issue ページから、プロンプトに埋め込む情報を取り出す。
 *
 * GitHub の DOM は現行 (Rails 製) と新しい React 製 (Morpheus) が混在しているため、
 * どの選択子も「見つからなければ次を試す」構成にし、取得できなかった項目は空文字を返す。
 * 空の項目はテンプレート側で行ごと削除される。
 */
var SendToCursor = globalThis.SendToCursor || (globalThis.SendToCursor = {});

(function (ns) {
  // 新しい Issue UI は完全に React 製で、Rails 版のクラスがひとつも無い。
  // 本文とコメントは data-testid で見分ける（コメントは末尾に GraphQL のノード ID が付く）。
  const COMMENT_BOX_PREFIX = "comment-viewer-outer-box-";

  const COMMENT_ROOT_SELECTOR = [
    ".js-comment",
    ".timeline-comment-group",
    ".review-comment",
    '[data-testid="issue-body"]',
    `[data-testid^="${COMMENT_BOX_PREFIX}"]`,
  ].join(", ");

  const THREAD_SELECTOR =
    "review-thread-collapsible, .review-thread-component, .js-resolvable-timeline-thread-container";

  ns.COMMENT_ROOT_SELECTOR = COMMENT_ROOT_SELECTOR;

  function clean(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** "owner:branch" 形式から branch 部分だけを取り出す */
  function branchOnly(label) {
    const text = clean(label);
    const index = text.lastIndexOf(":");
    return index === -1 ? text : text.slice(index + 1).trim();
  }

  /** PR も Issue もタイトルの持ち方は同じなので共通で扱う */
  function getTitle() {
    const classic = document.querySelector(
      '.js-issue-title, bdi.js-issue-title, [data-testid="issue-title"]',
    );
    if (classic) return clean(classic.textContent);

    const fromDocument = document.title.match(
      /^(.*?)(?: by [^·]*)? · (?:Pull Request|Issue) #\d+ ·/,
    );
    if (fromDocument) return clean(fromDocument[1]);

    const heading = document.querySelector("h1");
    if (heading)
      return clean(heading.textContent).replace(/\s*[-–—]?\s*#\d+$/, "");

    return "";
  }

  /**
   * Primer React 製の新しい PR ヘッダーのブランチリンク。
   * 「<作成者> wants to merge N commits into <base> from <head>」の順に並ぶので、
   * ヘッダーの説明部に絞ったうえで DOM 順の 1 件目を base、2 件目を head として扱う。
   */
  function branchLinks() {
    const scope =
      document.querySelector('[data-component="PageHeader.Description"]') ||
      document;
    const links = [...scope.querySelectorAll('[data-component="BranchName"]')];
    return { base: links[0] || null, head: links[1] || null };
  }

  /** 新 UI のブランチリンクは href が /owner/repo/tree/<branch> なので、テキストより確実 */
  function refFromLink(anchor) {
    if (!anchor) return { label: "", branch: "" };
    const label = clean(anchor.textContent);
    const match = (anchor.getAttribute("href") || "").match(
      /^\/[^/]+\/[^/]+\/tree\/(.+)$/,
    );
    const fromHref = match ? decodeURIComponent(match[1]) : "";
    return { label, branch: fromHref || branchOnly(label) };
  }

  function refFromElement(element) {
    const label = clean(element.textContent);
    return { label, branch: branchOnly(label) };
  }

  function getHeadRef() {
    const explicit = document.querySelector(".head-ref");
    if (explicit) return refFromElement(explicit);

    // 旧 UI の一部は head-ref クラスを持たず、base-ref を含まない .commit-ref が head になる
    const refs = [...document.querySelectorAll(".commit-ref")];
    const head = refs.find(
      (ref) =>
        !ref.classList.contains("base-ref") && !ref.querySelector(".base-ref"),
    );
    if (head) return refFromElement(head);

    return refFromLink(branchLinks().head);
  }

  function getBaseRef() {
    const explicit = document.querySelector(".base-ref");
    if (explicit) return refFromElement(explicit);

    const refs = [...document.querySelectorAll(".commit-ref")];
    const base = refs.find(
      (ref) =>
        ref.classList.contains("base-ref") || ref.querySelector(".base-ref"),
    );
    if (base) return refFromElement(base);

    return refFromLink(branchLinks().base);
  }

  /**
   * 読み上げ専用のテキストを除いた表示テキスト。
   * 新しい Issue UI のラベルは、リンクの中に説明文を .sr-only で持っているため、
   * そのまま textContent を読むとラベル名に説明文が続いてしまう。
   */
  function visibleText(element) {
    const copy = element.cloneNode(true);
    for (const hidden of copy.querySelectorAll(".sr-only")) hidden.remove();
    return clean(copy.textContent);
  }

  function getIssueLabels() {
    const container = document.querySelector(
      '.js-issue-labels, [data-testid="issue-labels"], #partial-discussion-sidebar .labels',
    );
    const nodes = container
      ? container.querySelectorAll("a")
      : document.querySelectorAll("a.IssueLabel");
    const names = [...nodes].map((node) => visibleText(node)).filter(Boolean);
    return [...new Set(names)].join(", ");
  }

  /** PR ヘッダーの「<author> wants to merge ...」から PR の作成者を取る */
  function getPageAuthor() {
    const meta = document.querySelector(
      ".gh-header-meta .author, .gh-header-meta a.author",
    );
    if (meta) return clean(meta.textContent);
    const body = ns.findBodyComment();
    return body ? getAuthor(body) : "";
  }

  /**
   * PR / Issue ページの共通情報。どちらでもないページでは null を返す。
   * kind は 'pull' か 'issue'。
   */
  ns.getPageContext = function getPageContext() {
    const match = location.pathname.match(
      /^\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/,
    );
    if (!match) return null;

    const [, owner, repo, section, number] = match;
    const repository = `${owner}/${repo}`;

    if (section === "issues") {
      return {
        kind: "issue",
        repository,
        issueNumber: number,
        issueTitle: getTitle(),
        issueUrl: `${location.origin}/${repository}/issues/${number}`,
        issueLabels: getIssueLabels(),
      };
    }

    const head = getHeadRef();

    return {
      kind: "pull",
      repository,
      prNumber: number,
      prTitle: getTitle(),
      prUrl: `${location.origin}/${repository}/pull/${number}`,
      headBranch: head.branch,
      // fork からの PR のときだけ "owner:branch" を併記したいので、同じなら空にする
      headLabel: head.label === head.branch ? "" : head.label,
      baseBranch: getBaseRef().branch,
    };
  };

  // コメントの "..." メニューにある「Copy Markdown」が本文の Markdown 原文を持っている
  const RAW_MARKDOWN_SELECTOR =
    ".timeline-comment-actions clipboard-copy[value], details-menu clipboard-copy[value]";

  function findRawMarkdown(root) {
    const copy = root.querySelector(RAW_MARKDOWN_SELECTOR);
    if (!copy) return "";
    const value = copy.getAttribute("value");
    return value && value.trim() ? value : "";
  }

  /**
   * 新しい Issue UI がページに埋め込んでいる GraphQL のプリロード結果。
   *
   * この UI の「Copy Markdown」は React のメニュー項目で、`clipboard-copy[value]` のように
   * DOM から原文を読めない。代わりにこの埋め込みデータが本文とコメントの原文を持っている。
   *
   * 初回読み込み時のスナップショットなので、ページネーションで後から読み込まれたコメントや
   * 投稿直後のコメントは含まれない。その場合は描画済み HTML のテキストで代用する。
   */
  let embeddedCache = { script: null, issue: null };

  function embeddedIssue() {
    const script = document.querySelector(
      'script[type="application/json"][data-target="react-app.embeddedData"]',
    );
    if (!script) return null;
    if (embeddedCache.script === script) return embeddedCache.issue;

    let issue = null;
    try {
      const data = JSON.parse(script.textContent);
      const queries = (data.payload && data.payload.preloadedQueries) || [];
      for (const query of queries) {
        const result = query && query.result;
        const repository = result && result.data && result.data.repository;
        if (repository && repository.issue) {
          issue = repository.issue;
          break;
        }
      }
    } catch {
      issue = null;
    }

    embeddedCache = { script, issue };
    return issue;
  }

  /**
   * 埋め込みデータ側の対応するノード。本文なら issue そのもの、コメントなら
   * data-testid の接尾辞（GraphQL のノード ID）が一致するタイムラインの要素。
   * どちらも body / author / url を同じ形で持っている。
   */
  function embeddedNode(root) {
    const issue = embeddedIssue();
    if (!issue) return null;

    if (root.matches('[data-testid="issue-body"]')) return issue;

    const testId = root.getAttribute("data-testid") || "";
    if (!testId.startsWith(COMMENT_BOX_PREFIX)) return null;
    const id = testId.slice(COMMENT_BOX_PREFIX.length);

    const timeline = issue.frontTimelineItems;
    for (const edge of (timeline && timeline.edges) || []) {
      if (edge.node && edge.node.id === id) return edge.node;
    }
    return null;
  }

  /** Markdown 原文。取れなければ描画済み HTML のテキストで代用する。 */
  function getRawMarkdown(root) {
    const raw = findRawMarkdown(root);
    if (raw) return raw;

    const node = embeddedNode(root);
    if (node && typeof node.body === "string" && node.body.trim())
      return node.body;

    const bodyEl = root.querySelector(
      '.js-comment-body, .comment-body, [data-testid="markdown-body"]',
    );
    return bodyEl ? bodyEl.innerText : "";
  }

  ns.hasRawMarkdown = function hasRawMarkdown(root) {
    return !!findRawMarkdown(root);
  };

  /**
   * Markdown 原文を読み込ませて待つ。
   *
   * 新しい PR UI ではコメントの "..." メニューの中身が include-fragment になっていて、
   * ホバーするまで Copy Markdown が DOM に存在しない。details-menu の preload は
   * mouseover / focusin で走るので、それを送って GitHub 自身に読み込ませる。
   * メニューが開くわけではないので見た目には影響しない。
   *
   * 読み込めなかった場合は空文字を返す（呼び出し側は代用テキストのまま使い続ける）。
   */
  ns.loadRawMarkdown = function loadRawMarkdown(root, timeoutMs = 3000) {
    const existing = findRawMarkdown(root);
    if (existing) return Promise.resolve(existing);

    const deferred = root.querySelector(
      ".timeline-comment-actions details-menu[src]",
    );
    const details = deferred && deferred.closest("details");
    const summary = details && details.querySelector("summary");
    if (!summary) return Promise.resolve("");

    summary.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    summary.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    return new Promise((resolve) => {
      const finish = (value) => {
        clearTimeout(timer);
        observer.disconnect();
        resolve(value);
      };
      const observer = new MutationObserver(() => {
        const value = findRawMarkdown(root);
        if (value) finish(value);
      });
      const timer = setTimeout(() => finish(""), timeoutMs);
      observer.observe(root, { childList: true, subtree: true });
    });
  };

  function getAuthor(root) {
    const author = root.querySelector(
      '.author, [data-testid="avatar-link"], [data-testid="issue-body-header-author"]',
    );
    if (author) return clean(author.textContent);
    const node = embeddedNode(root);
    return node && node.author ? clean(node.author.login) : "";
  }

  function getCommentUrl(root, pageUrl) {
    const timestamp = root.querySelector(
      'a.js-timestamp, a[href*="#discussion_r"], a[href*="#issuecomment-"], [data-testid="issue-body-header-link"]',
    );
    if (timestamp && timestamp.href) return timestamp.href;
    const node = embeddedNode(root);
    if (node && node.url) return node.url;
    if (root.id) return `${pageUrl}#${root.id}`;
    return "";
  }

  function getFilePath(root) {
    const thread = root.closest(THREAD_SELECTOR);
    if (thread) {
      const link = thread.querySelector("a.text-mono");
      if (link) return clean(link.textContent);
    }

    // Files changed タブではコメントが差分テーブルの中に描画される
    const file = root.closest(".file, .js-file");
    if (file) {
      const header = file.querySelector("[data-path]");
      if (header) return clean(header.getAttribute("data-path"));
      const tagsearch = file.getAttribute("data-tagsearch-path");
      if (tagsearch) return clean(tagsearch);
    }

    const withPath = root.closest("[data-path]");
    return withPath ? clean(withPath.getAttribute("data-path")) : "";
  }

  function getLines(root) {
    const thread = root.closest(THREAD_SELECTOR);
    if (thread) {
      const start = thread.querySelector(".js-multi-line-preview-start");
      const end = thread.querySelector(".js-multi-line-preview-end");
      const startText = start
        ? clean(start.textContent).replace(/^[+-]/, "")
        : "";
      const endText = end ? clean(end.textContent).replace(/^[+-]/, "") : "";
      if (startText && endText && startText !== endText)
        return `${startText}-${endText}`;
      if (startText) return startText;
    }

    // Files changed タブ: コメント行の直前にある差分行の行番号を使う
    const row = root.closest("tr");
    if (row) {
      let previous = row.previousElementSibling;
      while (previous) {
        const numbers = previous.querySelectorAll("td[data-line-number]");
        if (numbers.length) {
          return clean(
            numbers[numbers.length - 1].getAttribute("data-line-number"),
          );
        }
        previous = previous.previousElementSibling;
      }
    }

    return "";
  }

  const BODY_ID_RE = /^issue-\d+$/;

  /**
   * PR / Issue の説明文（タイムライン 1 件目）かどうか。
   * 説明文のコメントだけ id が "issue-<番号>" になっている。
   *
   * 新しい PR UI では、その中にさらに id="pullrequest-<番号>" のコメントが入れ子で描画される。
   * closest() では内側が先に見つかるので、祖先まで見ないと説明文をコメントと誤認する。
   */
  ns.isBodyComment = function isBodyComment(root) {
    if (root.matches('[data-testid="issue-body"]')) return true;
    if (BODY_ID_RE.test(root.id || "")) return true;
    const outer =
      root.parentElement && root.parentElement.closest('[id^="issue-"]');
    return !!outer && BODY_ID_RE.test(outer.id);
  };

  ns.findBodyComment = function findBodyComment() {
    for (const root of document.querySelectorAll(COMMENT_ROOT_SELECTOR)) {
      if (ns.isBodyComment(root)) return root;
    }
    return document.querySelector('[data-testid="issue-body"]');
  };

  ns.extractComment = function extractComment(root, pageContext) {
    const body = getRawMarkdown(root);
    if (!body || !body.trim()) return null;

    const pageUrl =
      pageContext.kind === "issue" ? pageContext.issueUrl : pageContext.prUrl;
    return {
      author: getAuthor(root),
      commentUrl: getCommentUrl(root, pageUrl),
      filePath: getFilePath(root),
      lines: getLines(root),
      body,
    };
  };

  /**
   * PR 全体のボタン用。説明文は Conversation タブにしか無いので、
   * Files changed タブなどでは本文が空のまま（テンプレート側で該当セクションが落ちる）。
   */
  ns.extractPullRequestBody = function extractPullRequestBody() {
    const root = ns.findBodyComment();
    return {
      root,
      author: getPageAuthor(),
      body: root ? getRawMarkdown(root) : "",
    };
  };

  // --- 失敗した CI チェック ------------------------------------------------
  //
  // チェック行のクラス名は新旧 UI で変わるが、詳細ページへのリンクの href は
  // check_run_id / actions/runs を含む形で安定しているので、リンクを起点に行を辿る。

  const CHECK_LINK_SELECTOR =
    'a[href*="check_run_id="], a[href*="/actions/runs/"], a[href*="/statuses/"]';

  const CHECK_ROW_SELECTOR =
    '.merge-status-item, .branch-action-item, [data-testid="status-check-row"], li, tr';

  const FAILURE_ICON_SELECTOR =
    ".octicon-x, .octicon-x-circle-fill, .octicon-stop, .octicon-alert";

  const FAILURE_TEXT_RE =
    /(failing|failed|failure|errored|cancelled|canceled|timed out)/i;

  const ANNOTATION_SELECTOR =
    '.check-annotation, [data-testid="check-annotation"]';

  // 新 UI は CSS モジュールなのでクラス名に生成ハッシュが付く。前方一致で拾う。
  const STATUS_TEXT_SELECTOR =
    '.status-meta, [data-testid="status-check-description"], [class*="StatusCheckRow-module__titleDescription"]';

  const CHECK_NAME_SELECTOR =
    'strong, .text-emphasized, .status-heading, [data-testid="status-check-name"], h4';

  function statusText(row) {
    const meta = row.querySelector(STATUS_TEXT_SELECTOR);
    // 状態テキストは "— Failing after 2m" のように区切り記号から始まる
    return clean(meta ? meta.textContent : row.textContent).replace(
      /^[-–—·:]\s*/,
      "",
    );
  }

  /** 赤い × アイコンを第一の判断材料にし、無ければ状態テキストを見る */
  function isFailingRow(row) {
    if (row.querySelector(FAILURE_ICON_SELECTOR)) return true;
    return FAILURE_TEXT_RE.test(statusText(row));
  }

  function getCheckName(row) {
    const named = row.querySelector(CHECK_NAME_SELECTOR);
    return named ? clean(named.textContent) : "";
  }

  function checkRunId(href) {
    try {
      return new URL(href, location.origin).searchParams.get("check_run_id");
    } catch {
      return null;
    }
  }

  /**
   * Checks タブで単一のチェックを開いているときだけ、表示されている annotation を本文に使える。
   * 一覧に並んでいる行から見た annotation はどのチェックのものか特定できないため使わない。
   */
  function getAnnotations(href) {
    const shown = new URLSearchParams(location.search).get("check_run_id");
    if (!shown || shown !== checkRunId(href)) return "";

    const texts = [...document.querySelectorAll(ANNOTATION_SELECTOR)]
      .map((node) => String(node.innerText || "").trim())
      .filter(Boolean);
    return texts.join("\n\n");
  }

  ns.findFailingChecks = function findFailingChecks() {
    const found = [];
    const seenRows = new Set();

    for (const link of document.querySelectorAll(CHECK_LINK_SELECTOR)) {
      const row = link.closest(CHECK_ROW_SELECTOR);
      if (!row || seenRows.has(row)) continue;
      // 複数のチェックを含む行は一覧そのものを掴んでいるので、対象にしない
      if (row.querySelectorAll(CHECK_LINK_SELECTOR).length > 1) continue;
      if (!isFailingRow(row)) continue;

      seenRows.add(row);
      const annotations = getAnnotations(link.href);
      found.push({
        row,
        link,
        checkName: getCheckName(row),
        checkUrl: link.href,
        failureOutput: [statusText(row), annotations]
          .filter(Boolean)
          .join("\n\n"),
      });
    }

    return found;
  };
})(SendToCursor);
