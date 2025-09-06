// Background script to handle dynamic new tab override
console.log('Background script loaded');

// Listen for tab creation
chrome.tabs.onCreated.addListener((tab) => {
    // Tab created - handled by onUpdated for better reliability
});

// Listen for tab updates to detect new tab page loads
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log('Tab updated:', tab.url, 'Status:', changeInfo.status);
    
    // Check if this is a new tab page that has finished loading
    if (changeInfo.status === 'complete' && tab.url) {
        const isNewTab = tab.url === 'chrome://newtab/' || 
                        tab.url === 'chrome://new-tab-page/' ||
                        tab.url.startsWith('chrome://new-tab-page/') ||
                        tab.url === 'chrome-search://local-ntp/local-ntp.html';
        
        if (isNewTab) {
            console.log('Detected new tab page loaded, checking user settings...');
            
            try {
                // Get user settings
                const result = await chrome.storage.sync.get(['newTabEnabled']);
                console.log('Storage result:', result);
                
                const newTabEnabled = result.newTabEnabled !== false; // Default to true if not set
                console.log('New tab enabled:', newTabEnabled);
                
                if (newTabEnabled) {
                    console.log('Redirecting to Hacker News new tab page...');
                    // Redirect to our new tab page
                    chrome.tabs.update(tabId, {
                        url: chrome.runtime.getURL('newtab.html')
                    });
                } else {
                    console.log('New tab override disabled, keeping Chrome default');
                }
            } catch (error) {
                console.error('Error in background script:', error);
                // If there's an error, default to enabled
                console.log('Error occurred, defaulting to enabled');
                chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL('newtab.html')
                });
            }
        }
    }
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated:', details.reason);
    // Set default settings
    chrome.storage.sync.set({ newTabEnabled: true });
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes, 'in namespace:', namespace);
    
    if (changes.newTabEnabled) {
        console.log('New tab setting changed to:', changes.newTabEnabled.newValue);
    }
});
