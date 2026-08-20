chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

/**
 * 入れた直後は表示言語もプロンプトも既定値のままなので、設定ページを開いて見てもらう。
 *
 * 開き直しは初回インストールだけに絞る。開発中の再読み込みは "update" 扱いになるので
 * ここには入ってこない（[chrome.runtime | Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/runtime):
 * "When an unpacked extension is reloaded, this is treated as an update. This means that the
 * chrome.runtime.onInstalled event will fire with the "update" reason."
 * = 「パッケージ化されていない拡張機能を再読み込みすると、これは更新として扱われます。
 * つまり chrome.runtime.onInstalled イベントは "update" の理由で発火します」）。
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.openOptionsPage();
  }
});
