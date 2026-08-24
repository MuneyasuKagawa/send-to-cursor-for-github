/**
 * コメント本文の整形、テンプレート展開、Cursor ディープリンクの組み立て。
 * DOM に依存しない純粋な処理のみを置く（test/harness.html から単体で検証できる）。
 */
var SendToCursor = globalThis.SendToCursor || (globalThis.SendToCursor = {});

(function (ns) {
  const PROTOCOL_BASE = "cursor://anysphere.cursor-deeplink/prompt";
  const WEB_BASE = "https://cursor.com/link/prompt";

  /**
   * 画像はプロンプトに入れても情報にならないので落とす。
   * バッジ画像のリンクは href にプロンプトを URL エンコードして持つことがあり、
   * それを本文として再エンコードすると数千文字に膨らんで 8,000 文字制限を圧迫する。
   */
  const IMAGE_LINK_RE =
    /<a\b[^>]*>\s*(?:<picture\b[\s\S]*?<\/picture>|<img\b[^>]*\/?>)\s*<\/a>/gi;
  const PICTURE_RE = /<picture\b[\s\S]*?<\/picture>/gi;
  const IMG_RE = /<img\b[^>]*\/?>/gi;

  ns.cleanCommentBody = function cleanCommentBody(raw) {
    if (!raw) return "";
    return String(raw)
      .replace(/\r\n/g, "\n")
      .replace(IMAGE_LINK_RE, "")
      .replace(PICTURE_RE, "")
      .replace(IMG_RE, "")
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/, ""))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
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
        if (result[end].trim() !== "") break;
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
      .split("\n")
      .filter((line) => {
        const names = [...line.matchAll(placeholder)].map((m) => m[1]);
        if (names.length === 0) return true;
        return names.every((name) => {
          const value = values[name];
          return (
            value !== undefined && value !== null && String(value).trim() !== ""
          );
        });
      });
    return dropEmptySections(kept)
      .join("\n")
      .replace(placeholder, (_match, name) => {
        const value = values[name];
        return value === undefined || value === null ? "" : String(value);
      })
      .replace(/\n{3,}/g, "\n\n");
  };

  ns.buildDeeplink = function buildDeeplink(prompt, linkMode) {
    const base = linkMode === "web" ? WEB_BASE : PROTOCOL_BASE;
    return `${base}?text=${encodeURIComponent(prompt)}`;
  };

  function textWithOmission(characters, keepCount, note) {
    const headCount = Math.ceil((keepCount * 2) / 3);
    const tailCount = keepCount - headCount;
    const head = characters.slice(0, headCount).join("");
    const tail =
      tailCount > 0 ? characters.slice(characters.length - tailCount).join("") : "";
    return [head, note, tail].filter(Boolean).join("\n\n");
  }

  /**
   * URL エンコード後の上限に収まる最大の文字数を二分探索する。
   * Array.from でコードポイント単位に分け、絵文字のサロゲートペアを途中で切らない。
   */
  function fitWithOmission(characters, note, render, linkMode, urlLimit) {
    const candidate = (keepCount) => {
      const prompt = render(textWithOmission(characters, keepCount, note));
      return {
        url: ns.buildDeeplink(prompt, linkMode),
        prompt,
      };
    };

    let low = 0;
    let high = characters.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (candidate(mid).url.length <= urlLimit) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return candidate(low);
  }

  /**
   * 8,000 文字制限に収まるまで本文の中間を縮める。
   * 通常は本文以外（ブランチ名や依頼内容）を残し、本文の先頭と末尾を保持する。
   * 固定部分だけで上限を超えるユーザー編集テンプレートでは、最終手段として
   * プロンプト全体の先頭と末尾を残して上限内に収める。
   *
   * bodyKey は本文を差し込むプレースホルダー名。対象によって {{commentBody}} /
   * {{issueBody}} / {{failureOutput}} などに変わる。
   */
  ns.buildPromptDeeplink = function buildPromptDeeplink({
    template,
    values,
    body,
    bodyKey = "commentBody",
    linkMode,
    urlLimit = ns.URL_LIMIT || 8000,
  }) {
    const normalizedBody = body == null ? "" : String(body);
    const render = (bodyText) =>
      ns.renderTemplate(template, { ...values, [bodyKey]: bodyText });
    const build = (bodyText) => {
      const prompt = render(bodyText);
      return { url: ns.buildDeeplink(prompt, linkMode), prompt };
    };

    const full = build(normalizedBody);
    if (full.url.length <= urlLimit) {
      return { ...full, truncated: false };
    }

    const bodyCharacters = Array.from(normalizedBody);
    const shortened = fitWithOmission(
      bodyCharacters,
      ns.t("prompt.truncationNote"),
      render,
      linkMode,
      urlLimit,
    );
    if (shortened.url.length <= urlLimit) {
      return { ...shortened, truncated: true };
    }

    // 固定部分だけで上限を超える場合も、無効な長さの deeplink は返さない。
    const fallback = fitWithOmission(
      Array.from(full.prompt),
      ns.t("prompt.fallbackTruncationNote"),
      (prompt) => prompt,
      linkMode,
      urlLimit,
    );
    return { ...fallback, truncated: true };
  };
})(SendToCursor);
