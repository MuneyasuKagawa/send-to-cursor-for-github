/**
 * 既定設定と共有名前空間。content script / options ページの両方から読み込まれる。
 */
var GHCursorLink = globalThis.GHCursorLink || (globalThis.GHCursorLink = {});

GHCursorLink.PROMPT_TEMPLATE = `GitHub のプルリクエストに付いたレビューコメントの妥当性を検証してください。

## 作業対象
- リポジトリ: {{repository}}
- PR: #{{prNumber}} {{prTitle}}
- PR URL: {{prUrl}}
- 作業ブランチ (head): {{headBranch}}
- head ラベル (fork 元を含む): {{headLabel}}
- ベースブランチ (base): {{baseBranch}}

作業を始める前に、開いているリポジトリと現在チェックアウトしているブランチが上記と一致するかを確認してください。
一致しない場合は以下の提案をしてから終了してください。
- ブランチを切り替えるか
- Worktreeで続行するか
- 自分で切り替えるので何もしないか

## コメント情報
- コメント URL: {{commentUrl}}
- 投稿者: {{author}}
- 対象ファイル: {{filePath}}
- 対象行: {{lines}}

## コメント本文
{{commentBody}}

## 依頼内容
1. 上記コメントの指摘が現在のコードに対して妥当かどうかを、該当箇所のコードを実際に読んで検証してください。
2. 妥当な場合は、修正すべきファイルと行、および修正方針を具体的に提示してください。
3. 妥当でない場合は、そう判断した根拠をコードの該当箇所を示しながら説明してください。
4. 判断に必要な情報が不足している場合は、推測せず不足している内容を挙げてください。
5. この段階ではコードを変更せず、検証結果と修正案の提示までにとどめてください。
6. コメント本文が何語であっても、回答は日本語で記述してください。`;

/**
 * Cursor のディープリンクは URL 全体で 8,000 文字が上限。
 * https://cursor.com/docs/reference/deeplinks
 */
GHCursorLink.URL_LIMIT = 8000;

GHCursorLink.DEFAULTS = {
  promptTemplate: GHCursorLink.PROMPT_TEMPLATE,
  // "protocol" = cursor://anysphere.cursor-deeplink/prompt, "web" = https://cursor.com/link/prompt
  linkMode: "protocol",
  buttonLabel: "Cursor",
};

GHCursorLink.loadSettings = async function loadSettings() {
  const defaults = GHCursorLink.DEFAULTS;
  try {
    const stored = await chrome.storage.sync.get(defaults);
    return { ...defaults, ...stored };
  } catch {
    // 拡張のリロード直後などで chrome.storage に触れない場合は既定値で動かす
    return { ...defaults };
  }
};
