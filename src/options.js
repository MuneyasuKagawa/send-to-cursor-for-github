(function (ns) {
  const fields = {
    promptTemplate: document.getElementById('promptTemplate'),
    buttonLabel: document.getElementById('buttonLabel'),
  };
  const status = document.getElementById('status');

  function linkModeInputs() {
    return [...document.querySelectorAll('input[name="linkMode"]')];
  }

  function apply(settings) {
    fields.promptTemplate.value = settings.promptTemplate;
    fields.buttonLabel.value = settings.buttonLabel;
    for (const input of linkModeInputs()) {
      input.checked = input.value === settings.linkMode;
    }
  }

  function showStatus(message) {
    status.textContent = message;
    setTimeout(() => {
      status.textContent = '';
    }, 2000);
  }

  async function save() {
    const selected = linkModeInputs().find((input) => input.checked);
    await chrome.storage.sync.set({
      promptTemplate: fields.promptTemplate.value,
      buttonLabel: fields.buttonLabel.value.trim() || ns.DEFAULTS.buttonLabel,
      linkMode: selected ? selected.value : ns.DEFAULTS.linkMode,
    });
    showStatus('保存しました');
  }

  document.getElementById('save').addEventListener('click', save);
  document.getElementById('reset').addEventListener('click', () => {
    fields.promptTemplate.value = ns.DEFAULTS.promptTemplate;
    showStatus('既定値に戻しました（保存を押すと反映されます）');
  });

  ns.loadSettings().then(apply);
})(GHCursorLink);
