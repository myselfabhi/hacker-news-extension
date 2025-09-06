// Background script to handle dynamic new tab override

// Listen for tab creation
chrome.tabs.onCreated.addListener((tab) => {
    // Tab created - handled by onUpdated for better reliability
});

// Listen for tab updates to detect new tab page loads
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Check if this is a new tab page that has finished loading
    if (changeInfo.status === 'complete' && tab.url) {
        const isNewTab = tab.url === 'chrome://newtab/' || 
                        tab.url === 'chrome://new-tab-page/' ||
                        tab.url.startsWith('chrome://new-tab-page/') ||
                        tab.url === 'chrome-search://local-ntp/local-ntp.html';
        
        if (isNewTab) {
            try {
                // Get user settings
                const result = await chrome.storage.sync.get(['newTabEnabled']);
                const newTabEnabled = result.newTabEnabled !== false; // Default to true if not set
                
                if (newTabEnabled) {
                    // Redirect to our new tab page
                    chrome.tabs.update(tabId, {
                        url: chrome.runtime.getURL('newtab.html')
                    });
                }
            } catch (error) {
                // If there's an error, default to enabled
                chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL('newtab.html')
                });
            }
        }
    }
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
    // Set default settings
    chrome.storage.sync.set({ newTabEnabled: true });
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    // Storage changed - could be used for additional functionality
});
