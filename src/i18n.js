/**
 * 表示言語の保持とメッセージの取り出し。
 *
 * chrome.i18n (_locales) はブラウザの UI 言語で決まるため、拡張の設定から切り替えられない
 * （[chrome.i18n | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/i18n):
 * "Search the messages file (if any) for the user's preferred locale."
 * = 「ユーザーの優先ロケールのメッセージファイル（あれば）を検索します」）。
 * 設定ページで言語を選べるようにするため、実行時の文言は src/locales/*.js の自前カタログから引く。
 * ブラウザ側が表示する manifest の description だけは _locales に置いている。
 */
var GHCursorLink = globalThis.GHCursorLink || (globalThis.GHCursorLink = {});

(function (ns) {
  ns.DEFAULT_LANGUAGE = 'ja';
  ns.LANGUAGES = ['ja', 'en'];

  // src/locales/*.js が自分で登録する。読み込み順に依存しないよう、ここでは器だけ用意する。
  ns.MESSAGES = ns.MESSAGES || {};

  let current = ns.DEFAULT_LANGUAGE;

  /** 保存値が壊れていても既定言語で動かす */
  ns.normalizeLanguage = function normalizeLanguage(value) {
    return ns.LANGUAGES.includes(value) ? value : ns.DEFAULT_LANGUAGE;
  };

  ns.setLanguage = function setLanguage(value) {
    current = ns.normalizeLanguage(value);
    return current;
  };

  function lookup(language, key) {
    const messages = ns.MESSAGES[language];
    return messages && typeof messages[key] === 'string' ? messages[key] : null;
  }

  /**
   * params は {name} の形で差し込む。プロンプトのテンプレートが使う {{name}} は
   * params を渡したときしか触らないので、二重括弧のプレースホルダーとは衝突しない。
   */
  ns.t = function t(key, params) {
    const text = lookup(current, key) || lookup(ns.DEFAULT_LANGUAGE, key);
    // 訳の抜けに気づけるよう、見つからなければキーをそのまま返す
    if (text === null) return key;
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) =>
      name in params ? String(params[name]) : match,
    );
  };
})(GHCursorLink);
