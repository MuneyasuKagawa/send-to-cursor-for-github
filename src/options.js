/**
 * 設定ページ。
 *
 * タブは「一般」＋対象ごとの 1 枚で、対象のタブとパネルは src/config.js の TARGETS から
 * 組み立てる。文言はすべて src/locales/*.js 経由なので、対象や言語を増やしてもここは触らない。
 */
(function (ns) {
  const tabs = document.getElementById('tabs');
  const panels = document.getElementById('panels');
  const status = document.getElementById('status');
  const languageSelect = document.getElementById('language');
  const buttonLabel = document.getElementById('buttonLabel');
  const showLabel = document.getElementById('showLabel');

  /** target.id -> { enabled: HTMLInputElement, template: HTMLTextAreaElement } */
  const controls = new Map();

  /** タブ id ('general' または target.id) -> タブのボタン。挿入順がタブの並び順。 */
  const tabButtons = new Map();

  /** textarea -> 最後のカーソル位置。プレースホルダーの挿入先に使う。 */
  const caretByTextarea = new WeakMap();

  let language = ns.DEFAULT_LANGUAGE;
  let activeTab = 'general';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function linkModeInputs() {
    return [...document.querySelectorAll('input[name="linkMode"]')];
  }

  function syncLabelInput() {
    buttonLabel.disabled = !showLabel.checked;
  }

  // --- 文言の差し込み -------------------------------------------------------

  /** メッセージ中の `...` を code 要素にする。cursor:// のような字面を地の文と区別するため。 */
  function setMessage(node, text) {
    node.textContent = '';
    String(text)
      .split(/`([^`]+)`/)
      .forEach((part, index) => {
        if (!part) return;
        node.append(index % 2 ? element('code', null, part) : part);
      });
  }

  /** 静的な HTML 側の文言。対象のパネルは作り直すので data-i18n を持たない。 */
  function localize() {
    document.documentElement.lang = language;
    document.title = ns.t('options.title');
    for (const node of document.querySelectorAll('[data-i18n]')) {
      setMessage(node, ns.t(node.dataset.i18n));
    }
  }

  // --- タブ -----------------------------------------------------------------

  function addTab(id, label) {
    const button = element('button', 'tab', label);
    button.type = 'button';
    button.id = `tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `panel-${id}`);
    button.addEventListener('click', () => selectTab(id));
    tabButtons.set(id, button);
    tabs.append(button);
    return button;
  }

  /**
   * オフの対象は、プロンプトの編集欄をたたんでタブにバッジを出す。
   * 編集しても効かない欄を残しておくと、オンにし忘れたことに気づけない。
   */
  function syncTarget(id) {
    const control = controls.get(id);
    const button = tabButtons.get(id);
    if (!control || !button) return;

    const off = !control.enabled.checked;
    control.prompt.toggleAttribute('data-collapsed', off);
    const badge = button.querySelector('.tab-off');
    if (badge) badge.hidden = !off;
    button.classList.toggle('tab--off', off);
  }

  function selectTab(id, { focus = false } = {}) {
    if (!tabButtons.has(id)) id = 'general';
    activeTab = id;
    for (const [tabId, button] of tabButtons) {
      const selected = tabId === id;
      button.setAttribute('aria-selected', String(selected));
      // 選択中のタブだけを Tab キーの対象にし、タブ間は矢印キーで移動する
      button.tabIndex = selected ? 0 : -1;
      document.getElementById(`panel-${tabId}`).hidden = !selected;
    }
    if (focus) tabButtons.get(id).focus();
    // 履歴を増やさずに、再読み込みしても同じタブに戻れるようにする
    history.replaceState(null, '', `#${id}`);
  }

  function onTabKeydown(event) {
    const ids = [...tabButtons.keys()];
    const current = ids.indexOf(activeTab);
    const moves = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: ids.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(ids[(next + ids.length) % ids.length], { focus: true });
  }

  // --- 対象のパネル ---------------------------------------------------------

  /**
   * カーソル位置に挿入する。
   * ボタンを押すと textarea からフォーカスが外れるので、直前の選択範囲を覚えておき、
   * 一度も触っていない textarea では末尾に足す。
   */
  function insertPlaceholder(textarea, name) {
    const caret = caretByTextarea.get(textarea) || {
      start: textarea.value.length,
      end: textarea.value.length,
    };
    textarea.focus();
    textarea.setRangeText(`{{${name}}}`, caret.start, caret.end, 'end');
    rememberCaret(textarea);
  }

  function rememberCaret(textarea) {
    caretByTextarea.set(textarea, {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    });
  }

  function placeholderButton(name, textarea) {
    const button = element('button', 'placeholder', `{{${name}}}`);
    button.type = 'button';
    button.title = ns.placeholderHint(name);
    // フォーカスが移るとカーソル位置が分からなくなるので、textarea から外さない
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => insertPlaceholder(textarea, name));
    return button;
  }

  function placeholderHint(target, textarea) {
    const hint = element('p', 'hint');
    hint.append(`${ns.t('options.target.insert')} `);
    for (const name of target.placeholders) {
      hint.append(placeholderButton(name, textarea), ' ');
    }
    return hint;
  }

  function buildTargetPanel(target) {
    const panel = element('section', 'panel');
    panel.id = `panel-${target.id}`;
    panel.dataset.targetPanel = '';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${target.id}`);
    panel.hidden = true;

    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.id = `enabled-${target.id}`;
    // 見た目に合わせて「スイッチ」として読み上げさせる（チェックボックスではなくオン/オフ）
    enabled.setAttribute('role', 'switch');
    enabled.addEventListener('change', () => {
      syncTarget(target.id);
      saveNow();
    });
    const toggle = element('label', 'toggle');
    toggle.append(enabled, element('span', null, ns.t('options.target.enabled')));

    // 見出しを textarea の名前にする（見出しの下にひとつだけある入力欄なので）
    const promptTitle = element('h3', null, ns.t('options.target.prompt'));
    promptTitle.id = `prompt-${target.id}`;

    const template = document.createElement('textarea');
    template.id = `template-${target.id}`;
    template.setAttribute('aria-labelledby', promptTitle.id);
    template.rows = 22;
    template.spellcheck = false;
    for (const event of ['keyup', 'mouseup', 'select', 'blur']) {
      template.addEventListener(event, () => rememberCaret(template));
    }
    template.addEventListener('input', saveSoon);

    const reset = element('button', null, ns.t('options.target.reset'));
    reset.type = 'button';
    reset.addEventListener('click', () => {
      template.value = ns.defaultTemplate(target.id);
      // 戻す前のカーソル位置は新しい本文では意味を持たないので捨てる
      caretByTextarea.delete(template);
      saveNow(ns.t('options.status.reset', { name: ns.targetName(target.id) }));
    });

    // オフのときにたたむ範囲。高さを詰めるのに overflow を切るので、入れ子にして
    // 外側 (.collapse) で高さを、内側で切り取りを担当させる。
    const prompt = element('div', 'collapse');
    const inner = element('div');
    inner.append(
      promptTitle,
      element('p', 'hint', ns.t('options.target.promptHint')),
      placeholderHint(target, template),
      template,
      reset,
    );
    prompt.append(inner);

    panel.append(
      element('h2', null, ns.targetName(target.id)),
      element('p', 'hint', ns.targetDescription(target.id)),
      toggle,
      prompt,
    );

    controls.set(target.id, { enabled, template, prompt });
    return panel;
  }

  /** タブと対象のパネルを作り直す。言語を切り替えたときもこれで丸ごと差し替える。 */
  function render() {
    for (const panel of panels.querySelectorAll('[data-target-panel]')) panel.remove();
    tabs.textContent = '';
    tabButtons.clear();
    controls.clear();

    addTab('general', ns.t('options.tab.general'));
    for (const target of ns.TARGETS) {
      panels.append(buildTargetPanel(target));
      const badge = element('span', 'tab-off', ns.t('options.tab.off'));
      badge.hidden = true;
      addTab(target.id, ns.targetName(target.id)).append(badge);
    }
    // ハッシュで指定されたタブが無ければ selectTab が「一般」に落とす
    selectTab(activeTab);
  }

  function apply(settings) {
    languageSelect.value = settings.language;
    buttonLabel.value = settings.buttonLabel;
    showLabel.checked = settings.showLabel !== false;
    syncLabelInput();
    for (const input of linkModeInputs()) {
      input.checked = input.value === settings.linkMode;
    }
    for (const [id, control] of controls) {
      control.enabled.checked = ns.isTargetEnabled(settings, id);
      control.template.value = ns.templateFor(settings, id);
      // 描画直後で、まだ一度も表示していない状態なのでアニメーションは走らない
      syncTarget(id);
    }
  }

  /** 保存値を読み直して、表示言語・タブ・入力欄をまとめて作り直す */
  async function load() {
    const settings = await ns.loadSettings();
    language = settings.language;
    localize();
    render();
    apply(settings);
  }

  // --- 保存 -----------------------------------------------------------------

  let statusTimer = null;

  /** エラーは消さずに残す。放っておくと、保存できていないのに設定できたと誤解される。 */
  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
    clearTimeout(statusTimer);
    if (isError) return;
    statusTimer = setTimeout(() => {
      status.textContent = '';
    }, 2600);
  }

  /**
   * プロンプトは ns.templateKey() のキーで対象ごと・言語ごとに保存する。
   * 既定値のままの対象は空文字にしておく。キーを消すには remove を別に投げることになり
   * 書き込み回数が倍になるので、「空 = 既定値を使う」を loadSettings 側と共有している。
   */
  function templatePayload() {
    const payload = {};
    for (const [id, control] of controls) {
      const value = control.template.value;
      const customized = value.trim() && value !== ns.defaultTemplate(id);
      payload[ns.templateKey(id, language)] = customized ? value : '';
    }
    return payload;
  }

  /**
   * storage.sync の 1 項目の上限。
   * https://developer.chrome.com/docs/extensions/reference/api/storage の QUOTA_BYTES_PER_ITEM。
   */
  const ITEM_LIMIT = 8192;

  function itemBytes(key, value) {
    return new TextEncoder().encode(JSON.stringify(value)).length + key.length;
  }

  /**
   * 上限を超える項目が 1 つでもあると set 全体が失敗し、他の設定まで保存されない。
   * Chrome から返るのは "QUOTA_BYTES_PER_ITEM quota exceeded" だけでどのプロンプトか分からないので、
   * 投げる前に自分で見つけて対象の名前とサイズを伝える。
   */
  function oversizedTemplate(payload) {
    for (const id of controls.keys()) {
      const key = ns.templateKey(id, language);
      const bytes = itemBytes(key, payload[key]);
      if (bytes > ITEM_LIMIT) {
        return ns.t('options.status.oversized', {
          name: ns.targetName(id),
          bytes,
          limit: ITEM_LIMIT,
        });
      }
    }
    return null;
  }

  async function save(message) {
    const selected = linkModeInputs().find((input) => input.checked);
    const enabledTargets = {};
    for (const [id, control] of controls) {
      enabledTargets[id] = control.enabled.checked;
    }

    const templates = templatePayload();
    const oversized = oversizedTemplate(templates);
    if (oversized) {
      showStatus(oversized, true);
      return false;
    }

    try {
      await chrome.storage.sync.set({
        buttonLabel: buttonLabel.value.trim() || ns.DEFAULTS.buttonLabel,
        showLabel: showLabel.checked,
        linkMode: selected ? selected.value : ns.DEFAULTS.linkMode,
        enabledTargets,
        ...templates,
      });
      // 空文字でも呼ぶ。保存できたなら、前に出したエラーは消さないといけない。
      showStatus(message || '');
      return true;
    } catch (error) {
      // 書き込み回数の上限などは事前に判定できないので、返ってきたメッセージをそのまま添える
      showStatus(ns.t('options.status.saveFailed', { error: error.message }), true);
      return false;
    }
  }

  let saveTimer = null;

  function saveNow(message = ns.t('options.status.saved')) {
    clearTimeout(saveTimer);
    saveTimer = null;
    return save(message);
  }

  /**
   * 文字入力は 1 打ごとに書かず、入力が止まってからまとめて保存する。
   * storage.sync の書き込みは 1 分 120 回 / 1 時間 1,800 回が上限。
   */
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(), 1000);
  }

  /**
   * 表示言語を切り替える。
   * textarea に入っているのは切り替え前の言語のプロンプトなので、先にその言語のキーで
   * 保存してから language を書き換え、新しい言語の保存値で描き直す。
   */
  async function changeLanguage(next) {
    if (next === language) return;
    clearTimeout(saveTimer);
    saveTimer = null;

    // 保存できないまま切り替えると、編集中のプロンプトが表示から消えて戻せなくなる
    if (!(await save())) {
      languageSelect.value = language;
      return;
    }

    try {
      await chrome.storage.sync.set({ language: next });
    } catch (error) {
      showStatus(ns.t('options.status.saveFailed', { error: error.message }), true);
      languageSelect.value = language;
      return;
    }

    await load();
    showStatus(ns.t('options.status.saved'));
  }

  function resetAllTemplates() {
    for (const [id, control] of controls) {
      control.template.value = ns.defaultTemplate(id);
      caretByTextarea.delete(control.template);
    }
    saveNow(ns.t('options.status.resetAll'));
  }

  /**
   * 古い保存形式のキーを片付ける。中身はすべて日本語のプロンプトで、loadSettings が
   * 日本語のときだけ読んで textarea に入れてくれているので、日本語を表示していて、
   * かつ今の形で書き出せたことを確認してから消す（先に消すと移行前のプロンプトが失われる）。
   */
  async function dropLegacyKeys() {
    if (language !== 'ja') return;
    const keys = ns.legacyTemplateKeys();
    try {
      const stored = await chrome.storage.sync.get(keys);
      const found = keys.filter((key) => stored[key] !== undefined);
      if (!found.length) return;
      if (await save()) await chrome.storage.sync.remove(found);
    } catch {
      // 読めない環境では移行を諦める。loadSettings 側は既定値へフォールバックする。
    }
  }

  function watch() {
    languageSelect.addEventListener('change', () => changeLanguage(languageSelect.value));
    for (const input of linkModeInputs()) {
      input.addEventListener('change', () => saveNow());
    }
    showLabel.addEventListener('change', () => {
      syncLabelInput();
      saveNow();
    });
    buttonLabel.addEventListener('input', saveSoon);
    document.getElementById('reset').addEventListener('click', resetAllTemplates);
    tabs.addEventListener('keydown', onTabKeydown);
    // 待っている間にタブを離れられても取りこぼさない
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && saveTimer) saveNow();
    });
  }

  activeTab = location.hash.slice(1) || 'general';
  watch();
  load().then(dropLegacyKeys);
})(GHCursorLink);
