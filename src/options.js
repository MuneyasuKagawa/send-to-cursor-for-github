/**
 * 設定ページ。対象ごとのセクションは src/config.js の TARGETS から組み立てるので、
 * 対象を増やしてもこのファイルを触る必要はない。
 */
(function (ns) {
  const status = document.getElementById('status');
  const buttonLabel = document.getElementById('buttonLabel');
  const showLabel = document.getElementById('showLabel');

  /** target.id -> { enabled: HTMLInputElement, template: HTMLTextAreaElement } */
  const controls = new Map();

  /** textarea -> 最後のカーソル位置。プレースホルダーの挿入先に使う。 */
  const caretByTextarea = new WeakMap();

  function linkModeInputs() {
    return [...document.querySelectorAll('input[name="linkMode"]')];
  }

  function syncLabelInput() {
    buttonLabel.disabled = !showLabel.checked;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

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
    button.title = ns.PLACEHOLDER_HINTS[name] || '';
    // フォーカスが移るとカーソル位置が分からなくなるので、textarea から外さない
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => insertPlaceholder(textarea, name));
    return button;
  }

  function placeholderHint(target, textarea) {
    const hint = element('p', 'hint');
    hint.append('クリックでカーソル位置に挿入: ');
    for (const name of target.placeholders) {
      hint.append(placeholderButton(name, textarea), ' ');
    }
    return hint;
  }

  function buildTargetSection(target) {
    const section = element('section', 'target');

    const toggle = element('label', 'checkbox');
    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    const text = element('span');
    text.append(element('strong', null, target.name), element('small', null, target.description));
    toggle.append(enabled, text);

    const template = document.createElement('textarea');
    template.rows = 24;
    template.spellcheck = false;
    for (const event of ['keyup', 'mouseup', 'select', 'blur']) {
      template.addEventListener(event, () => rememberCaret(template));
    }

    const details = document.createElement('details');
    details.append(element('summary', null, 'プロンプト'));
    details.append(placeholderHint(target, template), template);

    const reset = element('button', null, 'この対象のプロンプトを既定値に戻す');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      template.value = target.template;
      // 戻す前のカーソル位置は新しい本文では意味を持たないので捨てる
      caretByTextarea.delete(template);
      saveNow(`${target.name} のプロンプトを既定値に戻しました`);
    });
    details.append(reset);

    section.append(toggle, details);
    controls.set(target.id, { enabled, template });
    return section;
  }

  function render() {
    const container = document.getElementById('targets');
    for (const target of ns.TARGETS) {
      container.append(buildTargetSection(target));
    }
  }

  function apply(settings) {
    buttonLabel.value = settings.buttonLabel;
    showLabel.checked = settings.showLabel !== false;
    syncLabelInput();
    for (const input of linkModeInputs()) {
      input.checked = input.value === settings.linkMode;
    }
    for (const [id, control] of controls) {
      control.enabled.checked = ns.isTargetEnabled(settings, id);
      control.template.value = ns.templateFor(settings, id);
    }
  }

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
   * プロンプトは ns.templateKey() のキーで対象ごとに保存する。
   * 既定値のままの対象は空文字にしておく。キーを消すには remove を別に投げることになり
   * 書き込み回数が倍になるので、「空 = 既定値を使う」を loadSettings 側と共有している。
   */
  function templatePayload() {
    const payload = {};
    for (const [id, control] of controls) {
      const value = control.template.value;
      const customized = value.trim() && value !== ns.getTarget(id).template;
      payload[ns.templateKey(id)] = customized ? value : '';
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
      const key = ns.templateKey(id);
      const bytes = itemBytes(key, payload[key]);
      if (bytes > ITEM_LIMIT) {
        return `「${ns.getTarget(id).name}」のプロンプトが長すぎて保存できません（${bytes} / ${ITEM_LIMIT} バイト）。短くすると保存されます。`;
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
      showStatus(`保存できませんでした: ${error.message}`, true);
      return false;
    }
  }

  let saveTimer = null;

  function saveNow(message = '保存しました') {
    clearTimeout(saveTimer);
    saveTimer = null;
    save(message);
  }

  /**
   * 文字入力は 1 打ごとに書かず、入力が止まってからまとめて保存する。
   * storage.sync の書き込みは 1 分 120 回 / 1 時間 1,800 回が上限。
   */
  function saveSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(), 1000);
  }

  function watch() {
    for (const input of linkModeInputs()) {
      input.addEventListener('change', () => saveNow());
    }
    showLabel.addEventListener('change', () => saveNow());
    buttonLabel.addEventListener('input', saveSoon);
    for (const { enabled, template } of controls.values()) {
      enabled.addEventListener('change', () => saveNow());
      template.addEventListener('input', saveSoon);
    }
    // 待っている間にタブを離れられても取りこぼさない
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && saveTimer) saveNow();
    });
  }

  /**
   * 古い保存形式のキーを片付ける。中身は loadSettings が読んで textarea に入れてくれているので、
   * 今の形で書き出せたことを確認してから消す（先に消すと移行前のプロンプトが失われる）。
   */
  const LEGACY_KEYS = ['promptTemplate', 'templates'];

  async function dropLegacyKeys() {
    try {
      const stored = await chrome.storage.sync.get(LEGACY_KEYS);
      const found = LEGACY_KEYS.filter((key) => stored[key] !== undefined);
      if (!found.length) return;
      if (await save()) await chrome.storage.sync.remove(found);
    } catch {
      // 読めない環境では移行を諦める。loadSettings 側は既定値へフォールバックする。
    }
  }

  showLabel.addEventListener('change', syncLabelInput);
  document.getElementById('reset').addEventListener('click', () => {
    for (const target of ns.TARGETS) {
      const { template } = controls.get(target.id);
      template.value = target.template;
      caretByTextarea.delete(template);
    }
    saveNow('すべてのプロンプトを既定値に戻しました');
  });

  render();
  ns.loadSettings().then((settings) => {
    apply(settings);
    // 値を入れ終えてから監視を始める。apply 自体を保存の起点にしないため。
    watch();
    dropLegacyKeys();
  });
})(GHCursorLink);
