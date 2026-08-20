/**
 * 既定設定と共有名前空間。content script / options ページの両方から読み込まれる。
 *
 * ボタンを付ける対象は ns.TARGETS に 1 件ずつ定義する。有効/無効の既定値と
 * options ページの表示はここから導出されるので、対象を増やすときは TARGETS への追記と、
 * src/locales/*.js への文言追加、extract.js / content.js の抽出処理だけで済む。
 *
 * 表示名・説明・ツールチップ・プロンプトの既定値は言語で変わるため src/locales/*.js に置き、
 * このファイルには言語に依らない構造だけを置く。
 */
var SendToCursor = globalThis.SendToCursor || (globalThis.SendToCursor = {});

(function (ns) {
  const PR_CONTEXT_PLACEHOLDERS = [
    "repository",
    "prNumber",
    "prTitle",
    "prUrl",
    "headBranch",
    "headLabel",
    "baseBranch",
  ];

  const ISSUE_CONTEXT_PLACEHOLDERS = [
    "repository",
    "issueNumber",
    "issueTitle",
    "issueUrl",
  ];

  /**
   * bodyKey は本文を差し込むプレースホルダー名。URL の長さ制限を超えたときに
   * 縮めるのはこの項目だけ（src/prompt.js）。
   */
  ns.TARGETS = [
    {
      id: "prReview",
      bodyKey: "prBody",
      placeholders: [...PR_CONTEXT_PLACEHOLDERS, "author", "prBody"],
    },
    {
      id: "prComment",
      bodyKey: "commentBody",
      placeholders: [
        ...PR_CONTEXT_PLACEHOLDERS,
        "commentUrl",
        "author",
        "filePath",
        "lines",
        "commentBody",
      ],
    },
    {
      id: "ciFailure",
      bodyKey: "failureOutput",
      placeholders: [
        ...PR_CONTEXT_PLACEHOLDERS,
        "checkName",
        "checkUrl",
        "failureOutput",
      ],
    },
    {
      id: "issueBody",
      bodyKey: "issueBody",
      placeholders: [
        ...ISSUE_CONTEXT_PLACEHOLDERS,
        "issueLabels",
        "author",
        "issueBody",
      ],
    },
    {
      id: "issueComment",
      bodyKey: "commentBody",
      placeholders: [
        ...ISSUE_CONTEXT_PLACEHOLDERS,
        "commentUrl",
        "author",
        "commentBody",
      ],
    },
  ];

  ns.getTarget = function getTarget(id) {
    return ns.TARGETS.find((target) => target.id === id) || null;
  };

  ns.targetName = function targetName(id) {
    return ns.t(`targets.${id}.name`);
  };

  ns.targetDescription = function targetDescription(id) {
    return ns.t(`targets.${id}.description`);
  };

  ns.targetTooltip = function targetTooltip(id) {
    return ns.t(`targets.${id}.tooltip`);
  };

  /** 表示言語のプロンプト既定値。設定ページの「既定値に戻す」もこれを使う。 */
  ns.defaultTemplate = function defaultTemplate(id) {
    return ns.t(`targets.${id}.template`);
  };

  ns.placeholderHint = function placeholderHint(name) {
    return ns.t(`placeholders.${name}`);
  };

  /**
   * Cursor のディープリンクは URL 全体で 8,000 文字が上限。
   * https://cursor.com/docs/reference/deeplinks
   */
  ns.URL_LIMIT = 8000;

  ns.DEFAULTS = {
    // 表示言語。ブラウザの UI 言語ではなく設定ページで選ぶ（src/i18n.js のコメント参照）
    language: ns.DEFAULT_LANGUAGE,
    // "protocol" = cursor://anysphere.cursor-deeplink/prompt, "web" = https://cursor.com/link/prompt
    linkMode: "protocol",
    buttonLabel: "Cursor",
    // false のときはアイコンのみのボタンになる。buttonLabel は読み上げ用の名前として残る。
    showLabel: true,
    enabledTargets: Object.fromEntries(
      ns.TARGETS.map((target) => [target.id, true]),
    ),
  };

  ns.isTargetEnabled = function isTargetEnabled(settings, id) {
    return settings.enabledTargets[id] !== false;
  };

  /** settings.templates には編集されたプロンプトだけが入る。無ければ既定値を使う。 */
  ns.templateFor = function templateFor(settings, id) {
    const stored = (settings.templates || {})[id];
    if (typeof stored === "string" && stored.trim()) return stored;
    return ns.defaultTemplate(id);
  };

  /**
   * プロンプトの保存先キー。対象ごと・言語ごとに項目を分けている。
   *
   * 対象ごとに分けるのは、storage.sync の上限が 1 項目 8,192 バイト（QUOTA_BYTES_PER_ITEM）で、
   * 5 件を 1 項目にまとめると既定値だけで 7.6KB を使い切ってしまうため。
   * 言語ごとに分けるのは、言語を切り替えても編集したプロンプトを失わないため。
   */
  ns.templateKey = function templateKey(id, language) {
    return `template_${language}_${id}`;
  };

  /** 対象ごと・言語ごとのキーに移す前の保存形式。中身はすべて日本語のプロンプト。 */
  ns.legacyTemplateKeys = function legacyTemplateKeys() {
    return [
      "promptTemplate",
      "templates",
      ...ns.TARGETS.map((target) => `template_${target.id}`),
    ];
  };

  /**
   * 保存済みのプロンプトを対象ごとに取り出す。空文字は「既定値を使う」の意味。
   *
   * 過去の保存形式（言語別に分ける前の template_<id>、5 件を templates 1 項目に
   * まとめていた頃、対象が 1 種類で promptTemplate だけだった頃）も読めるようにしている。
   * どれも日本語のプロンプトなので、日本語を表示しているときだけ引き継ぐ。
   */
  function storedTemplates(stored, language) {
    const merged = (language === "ja" && stored.templates) || {};
    const templates = {};

    for (const target of ns.TARGETS) {
      const candidates = [stored[ns.templateKey(target.id, language)]];
      if (language === "ja") {
        candidates.push(stored[`template_${target.id}`], merged[target.id]);
        if (target.id === "prComment") candidates.push(stored.promptTemplate);
      }
      const value = candidates.find(
        (item) => typeof item === "string" && item.trim(),
      );
      if (value) templates[target.id] = value;
    }

    return templates;
  }

  /**
   * 保存済みの設定を既定値に重ねて返す。
   * 読み込んだ言語をそのまま ns.t() が使うので、ここで表示言語も確定させる。
   */
  ns.loadSettings = async function loadSettings() {
    let stored = null;
    try {
      // 対象ごとの設定はキーが動的なので、キー単位の既定値では埋まらない。全件取って自分で重ねる。
      stored = await chrome.storage.sync.get(null);
    } catch {
      // 拡張のリロード直後などで chrome.storage に触れない場合は既定値で動かす
    }
    stored = stored || {};

    const language = ns.setLanguage(stored.language);

    return {
      ...ns.DEFAULTS,
      ...stored,
      language,
      enabledTargets: {
        ...ns.DEFAULTS.enabledTargets,
        ...(stored.enabledTargets || {}),
      },
      templates: storedTemplates(stored, language),
    };
  };
})(SendToCursor);
