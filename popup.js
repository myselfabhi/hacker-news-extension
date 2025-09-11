// Cache Management Utilities
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

    // Get cache info for debugging
    async getCacheInfo() {
        const cached = await this.getCachedStories();
        if (!cached) {
            return { exists: false };
        }
        
        return {
            exists: true,
            isFresh: this.isCacheFresh(cached.timestamp),
            age: this.getCacheAge(cached.timestamp),
            storyCount: cached.stories ? cached.stories.length : 0,
            version: cached.version,
            timestamp: cached.timestamp
        };
    }

    // Force refresh cache (bypass cache check)
    async forceRefresh() {
        try {
            console.log('Force refreshing cache...');
            await this.clearCache();
            
            // Trigger background refresh
            chrome.runtime.sendMessage({ type: 'FORCE_REFRESH' });
            
            return true;
        } catch (error) {
            console.error('Failed to force refresh cache:', error);
            return false;
        }
    }

    // Check if cache is too old (more than 2 hours)
    isCacheTooOld(timestamp) {
        if (!timestamp) return true;
        const now = Date.now();
        const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        return (now - timestamp) > twoHours;
    }

    // Auto-cleanup old cache
    async autoCleanup() {
        try {
            const cached = await this.getCachedStories();
            if (cached && this.isCacheTooOld(cached.timestamp)) {
                console.log('Cache is too old, clearing...');
                await this.clearCache();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to auto-cleanup cache:', error);
            return false;
        }
    }

    // Get cache statistics
    async getCacheStats() {
        const info = await this.getCacheInfo();
        if (!info.exists) {
            return { status: 'No cache' };
        }
        
        return {
            status: info.isFresh ? 'Fresh' : 'Stale',
            age: `${info.age} minutes`,
            storyCount: info.stories,
            lastUpdated: new Date(info.timestamp).toLocaleString(),
            version: info.version
        };
    }
}

// Create a global instance
const hnCache = new HackerNewsCache();

// This is like your React component logic, but in vanilla JavaScript
class HackerNewsReader {
    constructor() {
        this.stories = [];
        this.init();
    }

    // Initialize the extension - like componentDidMount in React
    init() {
        this.setupEventListeners();
        this.loadStories();
        this.loadSettings();
    }

    // Set up event listeners - like onClick handlers in React
    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', () => {
            this.loadStories();
        });

        // Force refresh button
        const forceRefreshBtn = document.getElementById('forceRefreshBtn');
        forceRefreshBtn.addEventListener('click', () => {
            this.forceRefresh();
        });

        // New tab button
        const openNewTabBtn = document.getElementById('openNewTabBtn');
        openNewTabBtn.addEventListener('click', () => {
            this.openNewTabPage();
        });

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });

        // Close modal
        const closeModal = document.getElementById('closeModal');
        closeModal.addEventListener('click', () => {
            this.closeSettings();
        });

        // Save settings
        const saveSettings = document.getElementById('saveSettings');
        saveSettings.addEventListener('click', () => {
            this.saveSettings();
        });

        // Close modal when clicking outside
        const modal = document.getElementById('settingsModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSettings();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });
    }

    // Main function to load stories with cache-first approach
    async loadStories() {
        try {
            // Step 1: Check cache first
            const cached = await hnCache.getCachedStories();
            
            if (cached && hnCache.isCacheFresh(cached.timestamp)) {
                // Cache is fresh - show immediately
                console.log('Loading stories from cache (fresh data)');
                this.stories = cached.stories.slice(0, 10); // Popup shows only 10 stories
                this.displayStories();
                return;
            }
            
            // Step 2: Cache is stale/empty - show loading and fetch
            console.log('Cache is stale/empty, fetching fresh data...');
            this.showLoading();
            this.hideError();

            // Step 3: Get the list of top story IDs
            const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const storyIds = await response.json();

            // Step 4: Get details for the first 10 stories
            const topStoryIds = storyIds.slice(0, 10);
            
            // Fetch stories one by one to avoid rate limiting
            this.stories = [];
            for (let i = 0; i < topStoryIds.length; i++) {
                const storyId = topStoryIds[i];
                const story = await this.fetchStoryDetails(storyId);
                if (story) {
                    this.stories.push(story);
                }
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Step 5: Save to cache and display
            await hnCache.saveStoriesToCache(this.stories);
            this.displayStories();
            
        } catch (error) {
            console.error('Failed to load stories:', error);
            
            // Step 6: If API fails, try to show stale cache
            const cached = await hnCache.getCachedStories();
            if (cached && cached.stories) {
                console.log('API failed, showing stale cache data');
                this.stories = cached.stories.slice(0, 10);
                this.displayStories();
                this.showStaleDataWarning();
            } else {
                this.showError();
            }
        }
    }

    // Fetch individual story details - like a separate API call in your backend
    async fetchStoryDetails(storyId) {
        try {
            const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch story ${storyId}`);
            }
            
            const story = await response.json();
            return story;
        } catch (error) {
            return null;
        }
    }

    // Display stories in the UI - like rendering a list in React
    displayStories() {
        const storiesContainer = document.getElementById('stories');
        const loadingElement = document.getElementById('loading');
        
        // Hide loading
        loadingElement.style.display = 'none';
        storiesContainer.style.display = 'block';
        
        // Clear previous stories
        storiesContainer.innerHTML = '';
        
        // Filter out any null stories (failed fetches)
        const validStories = this.stories.filter(story => story !== null);
        
        if (validStories.length === 0) {
            storiesContainer.innerHTML = '<div class="error">No stories found</div>';
            return;
        }

        // Create HTML for each story - like mapping over an array in React
        validStories.forEach((story, index) => {
            const storyElement = this.createStoryElement(story);
            storiesContainer.appendChild(storyElement);
        });
    }

    // Create HTML element for a single story - like a React component
    createStoryElement(story) {
        const storyDiv = document.createElement('div');
        storyDiv.className = 'story';
        
        // Format the time - like date formatting in your apps
        const timeAgo = this.formatTimeAgo(story.time);
        
        // Create the HTML structure
        storyDiv.innerHTML = `
            <div class="story-title">
                <a href="${story.url || `https://news.ycombinator.com/item?id=${story.id}`}" 
                   target="_blank" 
                   rel="noopener noreferrer">
                    ${story.title || 'No title'}
                </a>
            </div>
            <div class="story-meta">
                <span class="story-score">${story.score || 0} points</span>
                <span>by ${story.by || 'unknown'}</span>
                <span>${timeAgo}</span>
                <span>${story.descendants || 0} comments</span>
            </div>
        `;
        
        return storyDiv;
    }

    // Format timestamp to "X hours ago" - like date-fns in your React apps
    formatTimeAgo(timestamp) {
        const now = Date.now() / 1000; // Convert to seconds
        const diff = now - timestamp;
        
        if (diff < 3600) {
            return `${Math.floor(diff / 60)} minutes ago`;
        } else if (diff < 86400) {
            return `${Math.floor(diff / 3600)} hours ago`;
        } else {
            return `${Math.floor(diff / 86400)} days ago`;
        }
    }

    // UI state management - like useState in React
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('stories').style.display = 'none';
        document.getElementById('error').style.display = 'none';
    }

    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('stories').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }

    // Open new tab page
    openNewTabPage() {
        chrome.tabs.create({ url: 'newtab.html' });
    }

    // Settings functionality
    openSettings() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Load settings from storage
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['newTabEnabled']);
            const newTabToggle = document.getElementById('newTabToggle');
            
            if (result.newTabEnabled !== undefined) {
                newTabToggle.checked = result.newTabEnabled;
            } else {
                // Default to enabled for new users
                newTabToggle.checked = true;
            }
        } catch (error) {
            // Settings loading failed, use default
        }
    }

    // Save settings to storage
    async saveSettings() {
        try {
            const newTabToggle = document.getElementById('newTabToggle');
            const newTabEnabled = newTabToggle.checked;
            
            await chrome.storage.sync.set({ newTabEnabled: newTabEnabled });
            
            // Show success message with specific feedback
            const message = newTabEnabled 
                ? 'New tab override enabled! New tabs will show Hacker News.'
                : 'New tab override disabled! New tabs will show Chrome default.';
            this.showSuccessMessage(message);
            
            // Close modal after a short delay
            setTimeout(() => {
                this.closeSettings();
            }, 1500);
            
        } catch (error) {
            this.showErrorMessage('Failed to save settings. Please try again.');
        }
    }

    // Show success message
    showSuccessMessage(message) {
        const saveBtn = document.getElementById('saveSettings');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '✅ ' + message;
        saveBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)';
        }, 2000);
    }

    // Show error message
    showErrorMessage(message) {
        const saveBtn = document.getElementById('saveSettings');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '❌ ' + message;
        saveBtn.style.background = 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)';
        
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)';
        }, 3000);
    }

    // Show stale data warning
    showStaleDataWarning() {
        // Create a temporary warning message
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(255, 165, 0, 0.3);
            max-width: 200px;
        `;
        warningDiv.textContent = '⚠️ Showing cached data (offline mode)';
        document.body.appendChild(warningDiv);
        
        setTimeout(() => {
            warningDiv.remove();
        }, 5000);
    }

    // Listen for background updates
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'STORIES_UPDATED') {
                console.log('Received background update, refreshing stories...');
                this.stories = message.stories.slice(0, 10); // Popup shows only 10 stories
                this.displayStories();
                
                // Show subtle update notification
                this.showUpdateNotification();
            }
        });
    }

    // Show update notification
    showUpdateNotification() {
        const notificationDiv = document.createElement('div');
        notificationDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
            max-width: 200px;
        `;
        notificationDiv.textContent = '✅ Stories updated';
        document.body.appendChild(notificationDiv);
        
        setTimeout(() => {
            notificationDiv.remove();
        }, 3000);
    }

    // Force refresh (clear cache and fetch fresh data)
    async forceRefresh() {
        try {
            console.log('Force refreshing stories...');
            this.showLoading();
            this.hideError();
            
            // Clear cache
            await hnCache.clearCache();
            
            // Fetch fresh data
            await this.loadStories();
            
            // Show success message
            this.showForceRefreshSuccess();
            
        } catch (error) {
            console.error('Force refresh failed:', error);
            this.showError();
        }
    }

    // Show force refresh success message
    showForceRefreshSuccess() {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
            max-width: 200px;
        `;
        successDiv.textContent = '🔄💨 Cache cleared & refreshed';
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Initialize the extension when the popup loads
// This is like React's main App component
document.addEventListener('DOMContentLoaded', () => {
    const reader = new HackerNewsReader();
    reader.setupMessageListener();
});
