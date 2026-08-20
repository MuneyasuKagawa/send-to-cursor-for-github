/**
 * 既定設定と共有名前空間。content script / options ページの両方から読み込まれる。
 *
 * ボタンを付ける対象は ns.TARGETS に 1 件ずつ定義する。有効/無効の既定値、
 * プロンプトのテンプレート、options ページの表示はすべてここから導出されるので、
 * 対象を増やすときは TARGETS への追記と、extract.js / content.js の抽出処理だけで済む。
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

  const PR_CONTEXT_PLACEHOLDERS = [
    'repository',
    'prNumber',
    'prTitle',
    'prUrl',
    'headBranch',
    'headLabel',
    'baseBranch',
  ];

  const ISSUE_CONTEXT_PLACEHOLDERS = ['repository', 'issueNumber', 'issueTitle', 'issueUrl'];

  /** 設定ページでプレースホルダーにホバーしたときに出す説明 */
  ns.PLACEHOLDER_HINTS = {
    repository: 'owner/repo 形式のリポジトリ名',
    prNumber: 'PR の番号（# は付きません）',
    prTitle: 'PR のタイトル',
    prUrl: 'PR のページの URL',
    prBody: 'PR の説明文（Markdown 原文）。Conversation タブ以外では取得できず空になります',
    headBranch: '作業ブランチ名 (head)',
    headLabel: 'fork からの PR のときだけ owner:branch 形式で入ります。同じリポジトリ内の PR では空',
    baseBranch: 'マージ先のブランチ名 (base)',
    author: 'コメントの投稿者。「PR 全体」では PR の作成者、「Issue の本文」では Issue の作成者',
    commentUrl: 'そのコメントへのリンク（アンカー付き）',
    commentBody: 'コメント本文（Markdown 原文）。画像は除去され、長い場合は末尾が省略されます',
    filePath: 'コメントが付いた差分のファイルパス。会話コメントでは空',
    lines: 'コメントが付いた行番号。複数行のときは 12-18 の形式',
    checkName: '失敗したチェックの名前',
    checkUrl: 'そのチェックの詳細ページの URL',
    failureOutput:
      'ページから読み取れた失敗の内容（状態テキストと、単一のチェックを開いているときは annotation）。ログ全文は含まれません',
    issueNumber: 'Issue の番号（# は付きません）',
    issueTitle: 'Issue のタイトル',
    issueUrl: 'Issue のページの URL',
    issueLabels: 'Issue に付いているラベル名のカンマ区切り。ラベルが無ければ空',
    issueBody: 'Issue の本文（Markdown 原文）。画像は除去され、長い場合は末尾が省略されます',
  };

  ns.TARGETS = [
    {
      id: 'prReview',
      name: 'PR 全体',
      description:
        'PR ヘッダーと PR 説明文にボタンを付けます。PR の変更差分全体をレビューさせます。',
      tooltip: 'Cursor でこの PR をレビューする',
      bodyKey: 'prBody',
      placeholders: [...PR_CONTEXT_PLACEHOLDERS, 'author', 'prBody'],
      template: `GitHub のプルリクエストの変更内容をレビューしてください。

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
    },

    {
      id: 'prComment',
      name: 'PR のコメント',
      description: 'PR のレビューコメントと会話コメントに、内容を検証して対応方針を出させるボタンを付けます。',
      tooltip: 'Cursor でこのコメントを検証する',
      bodyKey: 'commentBody',
      placeholders: [
        ...PR_CONTEXT_PLACEHOLDERS,
        'commentUrl',
        'author',
        'filePath',
        'lines',
        'commentBody',
      ],
      template: `GitHub のプルリクエストに付いたコメントの内容を検証し、対応方針を提示してください。

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
    },

    {
      id: 'ciFailure',
      name: '失敗した CI チェック',
      description:
        'PR のチェック一覧で失敗しているチェックの行にボタンを付けます。ログ全文はページから読み取れないため、原因の調査から依頼する形になります。',
      tooltip: 'Cursor でこの CI 失敗を調査する',
      bodyKey: 'failureOutput',
      placeholders: [...PR_CONTEXT_PLACEHOLDERS, 'checkName', 'checkUrl', 'failureOutput'],
      template: `GitHub の CI チェックが失敗した原因を調査してください。

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
    },

    {
      id: 'issueBody',
      name: 'Issue の本文',
      description: 'Issue の説明文にボタンを付けます。Issue の要求を実装する方針を立てさせます。',
      tooltip: 'Cursor でこの Issue の実装方針を立てる',
      bodyKey: 'issueBody',
      placeholders: [...ISSUE_CONTEXT_PLACEHOLDERS, 'issueLabels', 'author', 'issueBody'],
      template: `GitHub の Issue の内容を把握し、実装方針を提示してください。

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
    },

    {
      id: 'issueComment',
      name: 'Issue のコメント',
      description: 'Issue に付いたコメントに、内容を検証して対応方針を出させるボタンを付けます。',
      tooltip: 'Cursor でこのコメントを検証する',
      bodyKey: 'commentBody',
      placeholders: [...ISSUE_CONTEXT_PLACEHOLDERS, 'commentUrl', 'author', 'commentBody'],
      template: `GitHub の Issue に付いたコメントの内容を検証し、対応方針を提示してください。

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
    },
  ];

  ns.getTarget = function getTarget(id) {
    return ns.TARGETS.find((target) => target.id === id) || null;
  };

  /**
   * Cursor のディープリンクは URL 全体で 8,000 文字が上限。
   * https://cursor.com/docs/reference/deeplinks
   */
  ns.URL_LIMIT = 8000;

  ns.DEFAULTS = {
    // "protocol" = cursor://anysphere.cursor-deeplink/prompt, "web" = https://cursor.com/link/prompt
    linkMode: 'protocol',
    buttonLabel: 'Cursor',
    // false のときはアイコンのみのボタンになる。buttonLabel は読み上げ用の名前として残る。
    showLabel: true,
    enabledTargets: Object.fromEntries(ns.TARGETS.map((target) => [target.id, true])),
    templates: Object.fromEntries(ns.TARGETS.map((target) => [target.id, target.template])),
  };

  ns.isTargetEnabled = function isTargetEnabled(settings, id) {
    return settings.enabledTargets[id] !== false;
  };

  ns.templateFor = function templateFor(settings, id) {
    const stored = settings.templates[id];
    if (typeof stored === 'string' && stored.trim()) return stored;
    const target = ns.getTarget(id);
    return target ? target.template : '';
  };

  /**
   * プロンプトの保存先キー。対象ごとに項目を分けている。
   * storage.sync の上限は 1 項目 8,192 バイト（QUOTA_BYTES_PER_ITEM）なので、
   * 5 件を 1 項目にまとめると既定値だけで 7.6KB を使い切ってしまう。
   */
  ns.templateKey = function templateKey(id) {
    return `template_${id}`;
  };

  /**
   * 保存済みのプロンプトを対象ごとに取り出す。空文字は「既定値を使う」の意味。
   * 過去の保存形式（5 件を templates 1 項目にまとめていた頃、対象が 1 種類で
   * promptTemplate だけだった頃）も読めるようにしている。
   */
  function storedTemplates(stored) {
    const merged = stored.templates || {};
    const templates = {};

    for (const target of ns.TARGETS) {
      const value = stored[ns.templateKey(target.id)] ?? merged[target.id];
      if (typeof value === 'string' && value.trim()) templates[target.id] = value;
    }

    if (!templates.prComment && typeof stored.promptTemplate === 'string' && stored.promptTemplate.trim()) {
      templates.prComment = stored.promptTemplate;
    }

    return templates;
  }

  ns.loadSettings = async function loadSettings() {
    const defaults = ns.DEFAULTS;
    let stored = null;
    try {
      // 対象ごとの設定はキーが動的なので、キー単位の既定値では埋まらない。全件取って自分で重ねる。
      stored = await chrome.storage.sync.get(null);
    } catch {
      // 拡張のリロード直後などで chrome.storage に触れない場合は既定値で動かす
    }
    stored = stored || {};

    return {
      ...defaults,
      ...stored,
      enabledTargets: { ...defaults.enabledTargets, ...(stored.enabledTargets || {}) },
      templates: { ...defaults.templates, ...storedTemplates(stored) },
    };
  };
})(GHCursorLink);
