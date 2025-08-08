// Background service worker for the SCRUM Standup extension
console.log('SCRUM Standup extension background script loaded');

chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
    if (details.reason === 'install') {
        // Open options page on first install
        chrome.runtime.openOptionsPage();
    }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    if (request.action === 'openOptionsPage') {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});
