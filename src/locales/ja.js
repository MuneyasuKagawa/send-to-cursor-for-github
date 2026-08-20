/**
 * 日本語のメッセージ。キーは src/locales/en.js と 1 対 1 で対応させる。
 *
 * `targets.<id>.template` はプロンプトの既定値で、設定ページの「既定値に戻す」もここに戻る。
 * 文中の `{name}` は src/i18n.js が差し込む値、`{{name}}` はプロンプト展開時の
 * プレースホルダー（src/prompt.js が処理する）。
 */
var GHCursorLink = globalThis.GHCursorLink || (globalThis.GHCursorLink = {});

(function (ns) {
  /** ブランチを取り違えたまま作業させないための確認手順（ブランチのある対象で共有する） */
  const CHECK_REPO_AND_BRANCH = `作業を始める前に、開いているリポジトリと現在チェックアウトしているブランチが上記と一致するかを確認してください。
一致しない場合は以下の提案をしてから終了してください。
- ブランチを切り替えるか
- Worktreeで続行するか
- 自分で切り替えるので何もしないか`;

  /** Issue にはブランチが無いので、リポジトリの一致だけを確認する */
  const CHECK_REPO = `作業を始める前に、開いているリポジトリが上記と一致するかを確認してください。
一致しない場合は、正しいリポジトリを開くよう促してから終了してください。`;

  const PR_TARGET_LINES = `- リポジトリ: {{repository}}
- PR: #{{prNumber}} {{prTitle}}
- PR URL: {{prUrl}}
- 作業ブランチ (head): {{headBranch}}
- head ラベル (fork 元を含む): {{headLabel}}
- ベースブランチ (base): {{baseBranch}}`;

  const ISSUE_TARGET_LINES = `- リポジトリ: {{repository}}
- Issue: #{{issueNumber}} {{issueTitle}}
- Issue URL: {{issueUrl}}`;

  ns.MESSAGES = ns.MESSAGES || {};
  ns.MESSAGES.ja = {
    // --- 設定ページ -------------------------------------------------------
    'options.title': 'Send to Cursor for GitHub の設定',
    'options.tab.general': '一般',
    'options.tab.off': 'オフ',

    'options.language.title': '表示言語',
    'options.language.hint':
      '設定ページとボタンの表示、プロンプトの既定値に使う言語です。プロンプトは言語ごとに保存されるので、編集した内容は言語を切り替えても残ります。',

    'options.linkMode.title': 'リンクの開き方',
    'options.linkMode.protocol.title': '`cursor://` で直接開く',
    'options.linkMode.protocol.hint': 'Cursor アプリを直接起動します。通常はこちら。',
    'options.linkMode.web.title': '`https://cursor.com/link/` を経由する',
    'options.linkMode.web.hint':
      '直接起動が Chrome にブロックされる場合の代替。いったん cursor.com を開いてから Cursor に渡します。',

    'options.label.title': 'ボタンのラベル',
    'options.label.show': 'ラベルを表示する',
    'options.label.hint':
      'オフにするとアイコンだけのボタンになります。入力済みのラベルはスクリーンリーダー向けの名前として引き続き使われます。',

    'options.target.enabled': 'この対象にボタンを付ける',
    'options.target.prompt': 'プロンプト',
    'options.target.insert': 'クリックでカーソル位置に挿入:',
    'options.target.promptHint':
      '値が取得できなかったプレースホルダーを含む行はまるごと削除され、中身が空になった見出しも一緒に削除されます。',
    'options.target.reset': '既定値に戻す',

    'options.reset.title': 'プロンプトの初期化',
    'options.reset.hint':
      'すべての対象のプロンプトを、表示言語の既定値に戻します。編集した内容は失われます。対象ごとに戻すこともできます。',
    'options.reset.all': 'すべてのプロンプトを既定値に戻す',
    'options.status.saved': '保存しました',
    'options.status.reset': '「{name}」のプロンプトを既定値に戻しました',
    'options.status.resetAll': 'すべてのプロンプトを既定値に戻しました',
    'options.status.saveFailed': '保存できませんでした: {error}',
    'options.status.oversized':
      '「{name}」のプロンプトが長すぎて保存できません（{bytes} / {limit} バイト）。短くすると保存されます。',

    // --- ボタン -----------------------------------------------------------
    'button.copied': 'コピーしました',
    'tooltip.truncated': '{tooltip}（本文が長いため一部省略）',
    'tooltip.shiftToCopy': 'Shift+クリックでプロンプトをコピー',
    'prompt.truncationNote': '…(本文が長いため以降を省略しました)',
    'log.injectFailed': 'ボタンの挿入に失敗しました',

    // --- プレースホルダーの説明（設定ページでホバーしたときに出る） -------
    'placeholders.repository': 'owner/repo 形式のリポジトリ名',
    'placeholders.prNumber': 'PR の番号（# は付きません）',
    'placeholders.prTitle': 'PR のタイトル',
    'placeholders.prUrl': 'PR のページの URL',
    'placeholders.prBody':
      'PR の説明文（Markdown 原文）。Conversation タブ以外では取得できず空になります',
    'placeholders.headBranch': '作業ブランチ名 (head)',
    'placeholders.headLabel':
      'fork からの PR のときだけ owner:branch 形式で入ります。同じリポジトリ内の PR では空',
    'placeholders.baseBranch': 'マージ先のブランチ名 (base)',
    'placeholders.author':
      'コメントの投稿者。「PR 全体」では PR の作成者、「Issue の本文」では Issue の作成者',
    'placeholders.commentUrl': 'そのコメントへのリンク（アンカー付き）',
    'placeholders.commentBody': 'コメント本文（Markdown 原文）。画像は除去され、長い場合は末尾が省略されます',
    'placeholders.filePath': 'コメントが付いた差分のファイルパス。会話コメントでは空',
    'placeholders.lines': 'コメントが付いた行番号。複数行のときは 12-18 の形式',
    'placeholders.checkName': '失敗したチェックの名前',
    'placeholders.checkUrl': 'そのチェックの詳細ページの URL',
    'placeholders.failureOutput':
      'ページから読み取れた失敗の内容（状態テキストと、単一のチェックを開いているときは annotation）。ログ全文は含まれません',
    'placeholders.issueNumber': 'Issue の番号（# は付きません）',
    'placeholders.issueTitle': 'Issue のタイトル',
    'placeholders.issueUrl': 'Issue のページの URL',
    'placeholders.issueLabels': 'Issue に付いているラベル名のカンマ区切り。ラベルが無ければ空',
    'placeholders.issueBody': 'Issue の本文（Markdown 原文）。画像は除去され、長い場合は末尾が省略されます',

    // --- 対象 -------------------------------------------------------------
    'targets.prReview.name': 'PR 全体',
    'targets.prReview.description':
      'PR ヘッダーと PR 説明文にボタンを付けます。PR の変更差分全体をレビューさせます。',
    'targets.prReview.tooltip': 'Cursor でこの PR をレビューする',
    'targets.prReview.template': `GitHub のプルリクエストの変更内容をレビューしてください。

## 作業対象
${PR_TARGET_LINES}
- 作成者: {{author}}

${CHECK_REPO_AND_BRANCH}

## PR の説明
{{prBody}}

## 依頼内容
1. ベースブランチと作業ブランチの差分を確認し、変更全体の意図を把握してください。
2. 不具合につながる箇所を優先して指摘してください（境界値、エラー処理、非同期処理、後方互換性）。
3. 指摘は、該当ファイルと行、問題が起きる条件、修正方針をセットで示してください。
4. 変更内容が PR の説明と食い違っている箇所があれば指摘してください。
5. 判断に必要な情報が不足している場合は、推測せず不足している内容を挙げてください。
6. この段階ではコードを変更せず、レビュー結果の提示までにとどめてください。
7. 回答は日本語で記述してください。`,

    'targets.prComment.name': 'PR のコメント',
    'targets.prComment.description':
      'PR のレビューコメントと会話コメントに、内容を検証して対応方針を出させるボタンを付けます。',
    'targets.prComment.tooltip': 'Cursor でこのコメントを検証する',
    'targets.prComment.template': `GitHub のプルリクエストに付いたコメントの内容を検証し、対応方針を提示してください。

## 作業対象
${PR_TARGET_LINES}

${CHECK_REPO_AND_BRANCH}

## コメント情報
- コメント URL: {{commentUrl}}
- 投稿者: {{author}}
- 対象ファイル: {{filePath}}
- 対象行: {{lines}}

## コメント本文
{{commentBody}}

## 依頼内容
1. コメントの内容が現在のコードに当てはまるかを、該当箇所のコードを実際に読んで検証してください。
2. 対応が必要な場合は、変更すべきファイルと行、および対応方針を具体的に提示してください。
3. 対応が不要だと判断した場合は、その根拠をコードの該当箇所を示しながら説明してください。
4. 判断に必要な情報が不足している場合は、推測せず不足している内容を挙げてください。
5. この段階ではコードを変更せず、検証結果と対応案の提示までにとどめてください。
6. コメント本文が何語であっても、回答は日本語で記述してください。`,

    'targets.ciFailure.name': '失敗した CI チェック',
    'targets.ciFailure.description':
      'PR のチェック一覧で失敗しているチェックの行にボタンを付けます。ログ全文はページから読み取れないため、原因の調査から依頼する形になります。',
    'targets.ciFailure.tooltip': 'Cursor でこの CI 失敗を調査する',
    'targets.ciFailure.template': `GitHub の CI チェックが失敗した原因を調査してください。

## 作業対象
${PR_TARGET_LINES}

${CHECK_REPO_AND_BRANCH}

## 失敗したチェック
- チェック名: {{checkName}}
- チェックの URL: {{checkUrl}}

## ページから読み取れた内容
{{failureOutput}}

## 依頼内容
1. 失敗したチェックが何を実行しているかを、リポジトリ内のワークフロー定義や設定ファイルから特定してください。
2. 可能であれば同じコマンドをローカルで実行し、失敗を再現してください。
3. 失敗の原因を、該当ファイルと行を示しながら説明してください。
4. 修正方針を具体的に提示してください。
5. 上記の読み取れた内容はページに表示されていた範囲だけで、ログ全文は含まれていません。判断に足りない場合は、推測せず必要なログや実行結果を挙げてください。
6. この段階ではコードを変更せず、原因と修正案の提示までにとどめてください。
7. 回答は日本語で記述してください。`,

    'targets.issueBody.name': 'Issue の本文',
    'targets.issueBody.description':
      'Issue の説明文にボタンを付けます。Issue の要求を実装する方針を立てさせます。',
    'targets.issueBody.tooltip': 'Cursor でこの Issue の実装方針を立てる',
    'targets.issueBody.template': `GitHub の Issue の内容を把握し、実装方針を提示してください。

## 作業対象
${ISSUE_TARGET_LINES}
- ラベル: {{issueLabels}}
- 作成者: {{author}}

${CHECK_REPO}

## Issue 本文
{{issueBody}}

## 依頼内容
1. Issue の要求を、関連するコードを実際に読んで現状と照らし合わせて整理してください。
2. 要求が曖昧な箇所や、先に決めるべき仕様があれば列挙してください。
3. 実装方針を、変更すべきファイルと処理の流れがわかる粒度で提示してください。
4. 影響範囲（既存の挙動を変える箇所、テストを追加すべき箇所）を挙げてください。
5. この段階ではコードを変更せず、方針の提示までにとどめてください。
6. Issue 本文が何語であっても、回答は日本語で記述してください。`,

    'targets.issueComment.name': 'Issue のコメント',
    'targets.issueComment.description':
      'Issue に付いたコメントに、内容を検証して対応方針を出させるボタンを付けます。',
    'targets.issueComment.tooltip': 'Cursor でこのコメントを検証する',
    'targets.issueComment.template': `GitHub の Issue に付いたコメントの内容を検証し、対応方針を提示してください。

## 作業対象
${ISSUE_TARGET_LINES}

${CHECK_REPO}

## コメント情報
- コメント URL: {{commentUrl}}
- 投稿者: {{author}}

## コメント本文
{{commentBody}}

## 依頼内容
1. コメントの内容が現在のコードに当てはまるかを、関連箇所を実際に読んで検証してください。
2. 対応が必要な場合は、変更すべきファイルと行、および対応方針を具体的に提示してください。
3. 対応が不要だと判断した場合は、その根拠をコードの該当箇所を示しながら説明してください。
4. 判断に必要な情報が不足している場合は、推測せず不足している内容を挙げてください。
5. この段階ではコードを変更せず、検証結果と対応案の提示までにとどめてください。
6. コメント本文が何語であっても、回答は日本語で記述してください。`,
  };
})(GHCursorLink);
