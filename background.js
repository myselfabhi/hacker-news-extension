// Background script to handle dynamic new tab override and caching
console.log('Background script loaded');

// Inline cache utilities (importScripts not allowed in Manifest V3)
class HackerNewsCache {
    constructor() {
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.CACHE_KEY = 'hnCache';
        this.CACHE_VERSION = '1.0';
    }

    // Check if cached data is still fresh (within 30 minutes)
    isCacheFresh(timestamp) {
        if (!timestamp) return false;
        const now = Date.now();
        return (now - timestamp) < this.CACHE_DURATION;
    }

    // Get cached stories from Chrome storage
    async getCachedStories() {
        try {
            const result = await chrome.storage.local.get([this.CACHE_KEY]);
            return result[this.CACHE_KEY] || null;
        } catch (error) {
            console.error('Failed to get cached stories:', error);
            return null;
        }
    }

    // Save stories to Chrome storage with timestamp
    async saveStoriesToCache(stories) {
        try {
            const cacheData = {
                stories: stories,
                timestamp: Date.now(),
                version: this.CACHE_VERSION
            };
            await chrome.storage.local.set({ [this.CACHE_KEY]: cacheData });
            console.log('Stories cached successfully');
        } catch (error) {
            console.error('Failed to save stories to cache:', error);
        }
    }

    // Check if cache exists and is valid
    async hasValidCache() {
        const cached = await this.getCachedStories();
        return cached && this.isCacheFresh(cached.timestamp);
    }

    // Get cache age in minutes
    getCacheAge(timestamp) {
        if (!timestamp) return null;
        const now = Date.now();
        return Math.floor((now - timestamp) / (60 * 1000));
    }

    // Clear old cache data
    async clearCache() {
        try {
            await chrome.storage.local.remove([this.CACHE_KEY]);
            console.log('Cache cleared successfully');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }
}

// Create a global instance for background script
const hnCache = new HackerNewsCache();

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
    
    // Start background refresh on install/update
    startBackgroundRefresh();
});

// Start background refresh on extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension startup - starting background refresh');
    startBackgroundRefresh();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes, 'in namespace:', namespace);
    
    if (changes.newTabEnabled) {
        console.log('New tab setting changed to:', changes.newTabEnabled.newValue);
    }
});

// Background refresh functionality
let refreshInterval = null;

// Start background refresh (every 30 minutes)
function startBackgroundRefresh() {
    console.log('Starting background refresh...');
    
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Refresh immediately on startup
    refreshStoriesInBackground();
    
    // Then refresh every 30 minutes
    refreshInterval = setInterval(() => {
        console.log('Background refresh triggered (30 min interval)');
        refreshStoriesInBackground();
    }, 30 * 60 * 1000); // 30 minutes
    
    console.log('Background refresh scheduled every 30 minutes');
}

// Fetch stories from Hacker News API (background version)
async function fetchStoriesFromAPI() {
    try {
        console.log('Fetching stories from Hacker News API...');
        
        // Get the list of top story IDs
        const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const storyIds = await response.json();
        
        // Get details for the first 30 stories (fetch more to ensure we have 20 valid ones)
        const topStoryIds = storyIds.slice(0, 30);
        
        // Fetch stories in parallel batches of 5 to speed things up
        const batchSize = 5;
        const stories = [];
        
        for (let i = 0; i < topStoryIds.length; i += batchSize) {
            const batch = topStoryIds.slice(i, i + batchSize);
            
            // Fetch each batch in parallel
            const batchPromises = batch.map(async (storyId) => {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout per story
                    
                    const storyResponse = await fetch(
                        `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`,
                        { signal: controller.signal }
                    );
                    
                    clearTimeout(timeoutId);
                    
                    if (storyResponse.ok) {
                        const story = await storyResponse.json();
                        return story;
                    }
                    return null;
                } catch (error) {
                    console.warn(`Failed to fetch story ${storyId}:`, error.message);
                    return null;
                }
            });
            
            // Wait for all stories in this batch
            const batchResults = await Promise.all(batchPromises);
            
            // Add valid stories to our collection
            const validStories = batchResults.filter(story => story !== null);
            stories.push(...validStories);
            
            // Stop if we have enough stories
            if (stories.length >= 20) {
                break;
            }
            
            // Small delay between batches to avoid overwhelming the API
            if (i + batchSize < topStoryIds.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        console.log(`Successfully fetched ${stories.length} stories`);
        return stories.slice(0, 20); // Return exactly 20 stories
        
    } catch (error) {
        console.error('Failed to fetch stories from API:', error);
        throw error;
    }
}

// Background refresh (no UI loading, silent update)
async function refreshStoriesInBackground() {
    try {
        console.log('Background refresh: Fetching fresh stories...');
        
        const stories = await fetchStoriesFromAPI();
        
        if (stories && stories.length > 0) {
            // Save to cache
            await hnCache.saveStoriesToCache(stories);
            console.log('Background refresh: Stories cached successfully');
            
            // Notify any open popup/newtab pages about the update
            notifyUIOfUpdate(stories);
        } else {
            console.warn('Background refresh: No stories received');
        }
        
    } catch (error) {
        console.error('Background refresh failed:', error);
        // Don't throw error - background refresh should be silent
    }
}

// Notify UI components about cache update
function notifyUIOfUpdate(stories) {
    try {
        // Send message to all tabs with our extension pages
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && (
                    tab.url.includes('popup.html') || 
                    tab.url.includes('newtab.html') ||
                    tab.url.includes(chrome.runtime.getURL('popup.html')) ||
                    tab.url.includes(chrome.runtime.getURL('newtab.html'))
                )) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'STORIES_UPDATED',
                        stories: stories
                    }).catch(() => {
                        // Ignore errors - tab might be closed or not ready
                    });
                }
            });
        });
    } catch (error) {
        console.error('Failed to notify UI of update:', error);
    }
}

// Listen for messages from popup/newtab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FORCE_REFRESH') {
        console.log('Force refresh requested from UI');
        refreshStoriesInBackground();
        sendResponse({ success: true });
    } else if (message.type === 'FETCH_STORIES') {
        console.log('Fetch stories requested from UI');
        handleFetchStories(sendResponse);
        return true; // Keep the message channel open for async response
    }
});

// Handle fetch stories request
async function handleFetchStories(sendResponse) {
    try {
        // First check if we have fresh cache
        const cached = await hnCache.getCachedStories();
        if (cached && hnCache.isCacheFresh(cached.timestamp)) {
            console.log('Returning fresh cached stories');
            sendResponse({ 
                success: true, 
                stories: cached.stories,
                fromCache: true 
            });
            return;
        }
        
        // Cache is stale or empty, fetch fresh data
        console.log('Cache is stale/empty, fetching fresh stories...');
        const stories = await fetchStoriesFromAPI();
        
        if (stories && stories.length > 0) {
            // Save to cache
            await hnCache.saveStoriesToCache(stories);
            console.log('Fresh stories fetched and cached');
            sendResponse({ 
                success: true, 
                stories: stories,
                fromCache: false 
            });
        } else {
            throw new Error('No stories received from API');
        }
        
    } catch (error) {
        console.error('Failed to fetch stories:', error);
        
        // Try to return stale cache as fallback
        const cached = await hnCache.getCachedStories();
        if (cached && cached.stories && cached.stories.length > 0) {
            console.log('API failed, returning stale cached stories');
            sendResponse({ 
                success: true, 
                stories: cached.stories,
                fromCache: true,
                stale: true 
            });
        } else {
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        }
    }
}
