const saveOptions = () => {
  const apiKey = document.getElementById('api-key').value.trim();
  const status = document.getElementById('status');

  if (!apiKey) {
    status.textContent = 'Please enter an API key.';
    status.className = 'status error';
    return;
  }

  chrome.storage.sync.set({ groqApiKey: apiKey }, () => {
    status.textContent = 'Settings saved!';
    status.className = 'status success';
    setTimeout(() => { status.style.display = 'none'; }, 2000);
  });
};

const restoreOptions = () => {
  chrome.storage.sync.get({ groqApiKey: '' }, (items) => {
    document.getElementById('api-key').value = items.groqApiKey;
  });
};

const testConnection = () => {
  const apiKey = document.getElementById('api-key').value.trim();
  const status = document.getElementById('status');
  const testBtn = document.getElementById('test-btn');

  if (!apiKey) {
    status.textContent = 'Enter a key to test.';
    status.className = 'status error';
    return;
  }

  status.textContent = 'Testing...';
  status.className = 'status success';
  testBtn.disabled = true;

  chrome.runtime.sendMessage({ action: 'testConnection', apiKey: apiKey }, (result) => {
    testBtn.disabled = false;
    if (chrome.runtime.lastError) {
      status.textContent = 'Extension error: ' + chrome.runtime.lastError.message;
      status.className = 'status error';
      return;
    }
    if (result && result.success) {
      status.textContent = 'Connected! Key is valid.';
      status.className = 'status success';
    } else {
      status.textContent = 'Failed: ' + (result?.error || 'Unknown error');
      status.className = 'status error';
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  document.getElementById('save-btn').addEventListener('click', saveOptions);
  document.getElementById('test-btn').addEventListener('click', testConnection);
});