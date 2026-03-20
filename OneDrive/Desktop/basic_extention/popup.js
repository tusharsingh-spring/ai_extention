document.getElementById('summarize-btn').addEventListener('click', async () => {
    const btn = document.getElementById('summarize-btn');
    const loader = document.getElementById('loader');
    const resultBox = document.getElementById('result-container');
    const resultText = document.getElementById('result-text');
    const status = document.getElementById('status');
    const summaryType = document.getElementById('summary-type').value;

    status.style.display = 'none';
    resultBox.style.display = 'none';
    loader.style.display = 'block';
    btn.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) throw new Error('No active tab found.');

        // FIXED: Restricted pages (chrome://, about:, extensions pages) do not allow
        // content scripts. Detect and surface a friendly error early.
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
            throw new Error('Cannot summarize this page. Please navigate to a regular webpage.');
        }

        // 1. Get text from content script
        let response;
        try {
            response = await chrome.tabs.sendMessage(tab.id, { action: 'extractText' });
        } catch (e) {
            throw new Error('Could not connect to page. Please refresh the tab and try again.');
        }

        if (!response || !response.text || response.text.length < 50) {
            throw new Error('Not enough readable content found on this page.');
        }

        // 2. Send to background for summary
        chrome.runtime.sendMessage({
            action: 'summarize',
            text: response.text,
            type: summaryType
        }, (result) => {
            loader.style.display = 'none';
            btn.disabled = false;

            if (chrome.runtime.lastError) {
                status.textContent = 'Service error: ' + chrome.runtime.lastError.message;
                status.style.display = 'block';
                return;
            }

            // FIXED: Guard against null/undefined result
            if (!result) {
                status.textContent = 'No response from background service. Try reloading the extension.';
                status.style.display = 'block';
                return;
            }

            if (result.error) {
                status.textContent = result.error;
                status.style.display = 'block';
            } else {
                resultText.textContent = result.summary;
                resultBox.style.display = 'block';
            }
        });

    } catch (err) {
        loader.style.display = 'none';
        btn.disabled = false;
        status.textContent = err.message;
        status.style.display = 'block';
    }
});

document.getElementById('copy-btn').addEventListener('click', () => {
    const text = document.getElementById('result-text').textContent;
    navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.getElementById('copy-btn');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy Summary', 2000);
    });
});