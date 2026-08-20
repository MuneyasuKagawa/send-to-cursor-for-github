/**
 * コメント本文の整形、テンプレート展開、Cursor ディープリンクの組み立て。
 * DOM に依存しない純粋な処理のみを置く（test/harness.html から単体で検証できる）。
 */
var GHCursorLink = globalThis.GHCursorLink || (globalThis.GHCursorLink = {});

(function (ns) {
  const PROTOCOL_BASE = 'cursor://anysphere.cursor-deeplink/prompt';
  const WEB_BASE = 'https://cursor.com/link/prompt';

  /**
   * 画像はプロンプトに入れても情報にならないので落とす。
   * バッジ画像のリンクは href にプロンプトを URL エンコードして持つことがあり、
   * それを本文として再エンコードすると数千文字に膨らんで 8,000 文字制限を圧迫する。
   */
  const IMAGE_LINK_RE = /<a\b[^>]*>\s*(?:<picture\b[\s\S]*?<\/picture>|<img\b[^>]*\/?>)\s*<\/a>/gi;
  const PICTURE_RE = /<picture\b[\s\S]*?<\/picture>/gi;
  const IMG_RE = /<img\b[^>]*\/?>/gi;

  ns.cleanCommentBody = function cleanCommentBody(raw) {
    if (!raw) return '';
    return String(raw)
      .replace(/\r\n/g, '\n')
      .replace(IMAGE_LINK_RE, '')
      .replace(PICTURE_RE, '')
      .replace(IMG_RE, '')
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const HEADING_RE = /^#{1,6}\s/;

  /**
   * 中身が空になった見出しを削除する。
   * 「## 対象ファイル」のように、値が取れなかった行だけで構成されていたセクションは
   * 見出しだけが取り残されるため、後ろから走査してまとめて落とす。
   */
  function dropEmptySections(lines) {
    const result = [...lines];
    for (let i = result.length - 1; i >= 0; i -= 1) {
      if (!HEADING_RE.test(result[i])) continue;

      let end = i + 1;
      while (end < result.length && !HEADING_RE.test(result[end])) {
        if (result[end].trim() !== '') break;
        end += 1;
      }
      const isEmpty = end === result.length || HEADING_RE.test(result[end]);
      if (isEmpty) result.splice(i, end - i);
    }
    return result;
  }

  /**
   * テンプレートを展開する。
   * 値が空のプレースホルダーを含む行はまるごと削除するので、
   * 取得できなかった情報の見出しだけが残ることがない。
   */
  ns.renderTemplate = function renderTemplate(template, values) {
    const placeholder = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
    const kept = String(template)
      .split('\n')
      .filter((line) => {
        const names = [...line.matchAll(placeholder)].map((m) => m[1]);
        if (names.length === 0) return true;
        return names.every((name) => {
          const value = values[name];
          return value !== undefined && value !== null && String(value).trim() !== '';
        });
      });
    return dropEmptySections(kept)
      .join('\n')
      .replace(placeholder, (_match, name) => {
        const value = values[name];
        return value === undefined || value === null ? '' : String(value);
      })
      .replace(/\n{3,}/g, '\n\n');
  };

  ns.buildDeeplink = function buildDeeplink(prompt, linkMode) {
    const base = linkMode === 'web' ? WEB_BASE : PROTOCOL_BASE;
    return `${base}?text=${encodeURIComponent(prompt)}`;
  };

  const TRUNCATION_NOTE = '\n\n…(本文が長いため以降を省略しました)';

  /**
   * 8,000 文字制限に収まるまで本文だけを縮める。
   * 本文以外（ブランチ名や依頼内容）は必ず残るようにするため、二分探索で本文長を決める。
   *
   * bodyKey は本文を差し込むプレースホルダー名。対象によって {{commentBody}} /
   * {{issueBody}} / {{failureOutput}} などに変わる。
   */
  ns.buildPromptDeeplink = function buildPromptDeeplink({
    template,
    values,
    body,
    bodyKey = 'commentBody',
    linkMode,
    urlLimit = ns.URL_LIMIT || 8000,
  }) {
    const render = (bodyText) => ns.renderTemplate(template, { ...values, [bodyKey]: bodyText });
    const build = (bodyText) => ns.buildDeeplink(render(bodyText), linkMode);

    const full = build(body);
    if (full.length <= urlLimit) {
      return { url: full, prompt: render(body), truncated: false };
    }

    let low = 0;
    let high = body.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (build(body.slice(0, mid) + TRUNCATION_NOTE).length <= urlLimit) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    const truncatedBody = body.slice(0, low) + TRUNCATION_NOTE;
    return { url: build(truncatedBody), prompt: render(truncatedBody), truncated: true };
  };
})(GHCursorLink);
