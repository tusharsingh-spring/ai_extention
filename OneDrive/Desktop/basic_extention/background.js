// Groq: free tier, no credit card needed, OpenAI-compatible API
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // best free model on Groq

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['groqApiKey'], (result) => {
        if (!result.groqApiKey) {
            chrome.tabs.create({ url: 'options.html' });
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize') {
        handleSummarize(request.text, request.type || 'brief', sendResponse);
        return true;
    }
    if (request.action === 'testConnection') {
        handleTestConnection(request.apiKey, sendResponse);
        return true;
    }
});

async function fetchWithTimeout(url, options = {}, timeout = 20000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out (20s).');
        }
        throw error;
    }
}

async function handleTestConnection(apiKey, sendResponse) {
    try {
        const response = await fetchWithTimeout(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{ role: 'user', content: 'Say hello.' }],
                max_tokens: 10
            })
        }, 10000);

        if (response.ok) {
            sendResponse({ success: true });
        } else {
            const data = await response.json();
            sendResponse({ success: false, error: data.error?.message || response.statusText });
        }
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function handleSummarize(text, summaryType, sendResponse) {
    try {
        const { groqApiKey } = await chrome.storage.sync.get(['groqApiKey']);
        if (!groqApiKey) {
            sendResponse({ error: 'API Key missing. Please set it in options.' });
            return;
        }

        let prompt = `Summarize the following text briefly in 3 bullet points:\n\n${text}`;
        if (summaryType === 'detailed') {
            prompt = `Provide a detailed summary of the main points in the following text:\n\n${text}`;
        } else if (summaryType === 'bullets') {
            prompt = `Summarize the following article in 5-7 key points using dashes (-):\n\n${text}`;
        }

        const response = await fetchWithTimeout(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content || 'No summary generated.';
        sendResponse({ summary });

    } catch (error) {
        sendResponse({ error: error.message });
    }
}