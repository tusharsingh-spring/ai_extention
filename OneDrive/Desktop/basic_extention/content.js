chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractText' || request.type === 'GET_ARTICLE_TEXT') {
        try {
            // FIXED: innerText on a detached clone returns empty string in many browsers.
            // Instead, hide unwanted elements on the live DOM, read innerText, then restore.
            const selectorsToHide = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe'];
            const hiddenEls = [];

            selectorsToHide.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    // Save original display and hide
                    hiddenEls.push({ el, display: el.style.display });
                    el.style.display = 'none';
                });
            });

            const text = document.body.innerText.replace(/\s+/g, ' ').trim();

            // Restore all hidden elements
            hiddenEls.forEach(({ el, display }) => {
                el.style.display = display;
            });

            sendResponse({ text: text.substring(0, 20000) });
        } catch (err) {
            sendResponse({ text: '', error: err.message });
        }
    }
    return true;
});