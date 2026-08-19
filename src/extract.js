/**
 * GitHub の PR ページから、プロンプトに埋め込む情報を取り出す。
 *
 * GitHub の DOM は現行 (Rails 製) と新しい React 製 (Morpheus) が混在しているため、
 * どの選択子も「見つからなければ次を試す」構成にし、取得できなかった項目は空文字を返す。
 * 空の項目はテンプレート側で行ごと削除される。
 */
var GHCursorLink = globalThis.GHCursorLink || (globalThis.GHCursorLink = {});

(function (ns) {
  const COMMENT_ROOT_SELECTOR =
    '.js-comment, .timeline-comment-group, .review-comment';

  const THREAD_SELECTOR =
    'review-thread-collapsible, .review-thread-component, .js-resolvable-timeline-thread-container';

  ns.COMMENT_ROOT_SELECTOR = COMMENT_ROOT_SELECTOR;

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  /** "owner:branch" 形式から branch 部分だけを取り出す */
  function branchOnly(label) {
    const text = clean(label);
    const index = text.lastIndexOf(':');
    return index === -1 ? text : text.slice(index + 1).trim();
  }

  function getPrTitle() {
    const classic = document.querySelector('.js-issue-title, bdi.js-issue-title');
    if (classic) return clean(classic.textContent);

    const fromDocument = document.title.match(/^(.*?)(?: by [^·]*)? · Pull Request #\d+ ·/);
    if (fromDocument) return clean(fromDocument[1]);

    const heading = document.querySelector('h1');
    if (heading) return clean(heading.textContent).replace(/\s*[-–—]?\s*#\d+$/, '');

    return '';
  }

  function getHeadLabel() {
    const explicit = document.querySelector('.head-ref');
    if (explicit) return clean(explicit.textContent);

    // 新しい PR ヘッダーには head-ref クラスが無く、base-ref を含まない .commit-ref が head になる
    const refs = [...document.querySelectorAll('.commit-ref')];
    const head = refs.find(
      (ref) => !ref.classList.contains('base-ref') && !ref.querySelector('.base-ref')
    );
    return head ? clean(head.textContent) : '';
  }

  function getBaseLabel() {
    const explicit = document.querySelector('.base-ref');
    if (explicit) return clean(explicit.textContent);

    const refs = [...document.querySelectorAll('.commit-ref')];
    const base = refs.find(
      (ref) => ref.classList.contains('base-ref') || ref.querySelector('.base-ref')
    );
    return base ? clean(base.textContent) : '';
  }

  /** PR ページでなければ null を返す */
  ns.getPullRequestContext = function getPullRequestContext() {
    const match = location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) return null;

    const [, owner, repo, prNumber] = match;
    const headLabel = getHeadLabel();
    const headBranch = branchOnly(headLabel);

    return {
      repository: `${owner}/${repo}`,
      prNumber,
      prTitle: getPrTitle(),
      prUrl: `${location.origin}/${owner}/${repo}/pull/${prNumber}`,
      headBranch,
      // fork からの PR のときだけ "owner:branch" を併記したいので、同じなら空にする
      headLabel: headLabel === headBranch ? '' : headLabel,
      baseBranch: branchOnly(getBaseLabel()),
    };
  };

  /**
   * コメント本文の Markdown 原文。
   * コメントの "..." メニューにある「Copy Markdown」の clipboard-copy が原文を持っている。
   */
  function getRawMarkdown(root) {
    const copy = root.querySelector(
      '.timeline-comment-actions clipboard-copy[value], details-menu clipboard-copy[value]'
    );
    if (copy) {
      const value = copy.getAttribute('value');
      if (value && value.trim()) return value;
    }
    const bodyEl = root.querySelector('.js-comment-body, .comment-body');
    return bodyEl ? bodyEl.innerText : '';
  }

  function getAuthor(root) {
    const author = root.querySelector('.author, [data-testid="avatar-link"]');
    return author ? clean(author.textContent) : '';
  }

  function getCommentUrl(root, prUrl) {
    const timestamp = root.querySelector('a.js-timestamp, a[href*="#discussion_r"], a[href*="#issuecomment-"]');
    if (timestamp && timestamp.href) return timestamp.href;
    if (root.id) return `${prUrl}#${root.id}`;
    return '';
  }

  function getFilePath(root) {
    const thread = root.closest(THREAD_SELECTOR);
    if (thread) {
      const link = thread.querySelector('a.text-mono');
      if (link) return clean(link.textContent);
    }

    // Files changed タブではコメントが差分テーブルの中に描画される
    const file = root.closest('.file, .js-file');
    if (file) {
      const header = file.querySelector('[data-path]');
      if (header) return clean(header.getAttribute('data-path'));
      const tagsearch = file.getAttribute('data-tagsearch-path');
      if (tagsearch) return clean(tagsearch);
    }

    const withPath = root.closest('[data-path]');
    return withPath ? clean(withPath.getAttribute('data-path')) : '';
  }

  function getLines(root) {
    const thread = root.closest(THREAD_SELECTOR);
    if (thread) {
      const start = thread.querySelector('.js-multi-line-preview-start');
      const end = thread.querySelector('.js-multi-line-preview-end');
      const startText = start ? clean(start.textContent).replace(/^[+-]/, '') : '';
      const endText = end ? clean(end.textContent).replace(/^[+-]/, '') : '';
      if (startText && endText && startText !== endText) return `${startText}-${endText}`;
      if (startText) return startText;
    }

    // Files changed タブ: コメント行の直前にある差分行の行番号を使う
    const row = root.closest('tr');
    if (row) {
      let previous = row.previousElementSibling;
      while (previous) {
        const numbers = previous.querySelectorAll('td[data-line-number]');
        if (numbers.length) {
          return clean(numbers[numbers.length - 1].getAttribute('data-line-number'));
        }
        previous = previous.previousElementSibling;
      }
    }

    return '';
  }

  ns.extractComment = function extractComment(root, prContext) {
    const body = getRawMarkdown(root);
    if (!body || !body.trim()) return null;

    return {
      author: getAuthor(root),
      commentUrl: getCommentUrl(root, prContext.prUrl),
      filePath: getFilePath(root),
      lines: getLines(root),
      body,
    };
  };
})(GHCursorLink);
