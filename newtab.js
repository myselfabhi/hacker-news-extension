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
            
            // Update the display timestamp
            this.updateDisplayTimestamp(cacheData.timestamp);
        } catch (error) {
            console.error('Failed to save stories to cache:', error);
        }
    }

    // Update the display timestamp
    updateDisplayTimestamp(timestamp) {
        const updateTimeElement = document.querySelector('.update-time');
        if (updateTimeElement) {
            const now = Date.now();
            const minutesAgo = Math.floor((now - timestamp) / (60 * 1000));
            
            if (minutesAgo < 1) {
                updateTimeElement.textContent = 'Updated just now';
            } else if (minutesAgo === 1) {
                updateTimeElement.textContent = 'Updated 1 min ago';
            } else {
                updateTimeElement.textContent = `Updated ${minutesAgo} mins ago`;
            }
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

// New Tab VU tech Reader
class NewTabHackerNewsReader {
    constructor() {
        this.stories = [];
        this.remainingStories = [];
        this.init();
    }

    // Initialize the new tab page
    init() {
        this.setupEventListeners();
        this.loadStories();
        this.loadSettings();
        this.loadCustomShortcuts();
        this.initChromeFunctionality();
        this.startLiveUpdates();
    }

    // Set up event listeners
    setupEventListeners() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
            });
            return;
        }

        // Action buttons in the new panel header
        const actionBtns = document.querySelectorAll('.action-btn');
        
        if (actionBtns.length === 0) {
            setTimeout(() => this.setupEventListeners(), 100);
            return;
        }

        actionBtns.forEach((btn, index) => {
            if (btn) {
                btn.addEventListener('click', () => {
                    switch(index) {
                        case 0: // Refresh button
                            this.forceRefresh();
                            break;
                        case 1: // Theme button
                            // Add theme toggle functionality here
                            break;
                        case 2: // Settings button
                            this.openSettings();
                            break;
                    }
                });
            }
        });

        // Close modal
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeSettings();
            });
        }

        // Save settings
        const saveSettings = document.getElementById('saveSettings');
        if (saveSettings) {
            saveSettings.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // Close modal when clicking outside
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeSettings();
                }
            });
        }

        // Close add shortcut modal when clicking outside
        const addShortcutModal = document.getElementById('addShortcutModal');
        if (addShortcutModal) {
            addShortcutModal.addEventListener('click', (e) => {
                if (e.target === addShortcutModal) {
                    this.closeAddShortcutModal();
                }
            });
        }

        // Close custom URL modal when clicking outside
        const customUrlModal = document.getElementById('customUrlModal');
        if (customUrlModal) {
            customUrlModal.addEventListener('click', (e) => {
                if (e.target === customUrlModal) {
                    this.closeCustomUrlModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
                this.closeAddShortcutModal();
                this.closeCustomUrlModal();
            }
        });

        // Add shortcut button
        const addShortcutBtn = document.getElementById('addShortcutBtn');
        if (addShortcutBtn) {
            addShortcutBtn.addEventListener('click', () => {
                this.openAddShortcutModal();
            });
        }

        // Add shortcut modal close buttons
        const closeAddShortcutModal = document.getElementById('closeAddShortcutModal');
        if (closeAddShortcutModal) {
            closeAddShortcutModal.addEventListener('click', () => {
                this.closeAddShortcutModal();
            });
        }

        // Quick shortcut buttons
        document.querySelectorAll('.quick-shortcut-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.getAttribute('data-name');
                const url = btn.getAttribute('data-url');
                const service = btn.getAttribute('data-service');
                this.addQuickShortcut(name, url, service);
            });
        });

        // Custom URL button
        const addCustomUrlBtn = document.getElementById('addCustomUrlBtn');
        if (addCustomUrlBtn) {
            addCustomUrlBtn.addEventListener('click', () => {
                this.openCustomUrlModal();
            });
        }

        // Custom URL modal close buttons
        const closeCustomUrlModal = document.getElementById('closeCustomUrlModal');
        if (closeCustomUrlModal) {
            closeCustomUrlModal.addEventListener('click', () => {
                this.closeCustomUrlModal();
            });
        }

        const cancelCustomUrl = document.getElementById('cancelCustomUrl');
        if (cancelCustomUrl) {
            cancelCustomUrl.addEventListener('click', () => {
                this.closeCustomUrlModal();
            });
        }

        // Save shortcut
        const saveShortcut = document.getElementById('saveShortcut');
        if (saveShortcut) {
            saveShortcut.addEventListener('click', () => {
                this.saveCustomShortcut();
            });
        }

        // Load more stories button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreStories();
            });
        }

        // Authentication event listeners
        this.setupAuthEventListeners();
        
        // Auth icon event listener
        this.setupAuthIconListener();

        // Setup crazy search bar
        this.setupCrazySearchBar();

        // Setup crazy shortcuts
        this.setupCrazyShortcuts();

        // Setup crazy left panel background
        this.setupCrazyLeftPanelBackground();
        
        // Setup crazy data visualization
        this.setupCrazyDataVisualization();
        
        // Setup crazy news feed
        this.setupCrazyNewsFeed();
        
        // Setup floating AI assistant
        this.setupFloatingAIAssistant();
        
        // Setup live activity monitor
        this.setupLiveActivityMonitor();
        
        // Setup enhanced right panel
        this.setupEnhancedRightPanel();
    }

    // Load stories from Hacker News API with cache-first approach
    async loadStories() {
        try {
            console.log('Starting to load stories...');
            
            // Step 1: Check cache first
            const cached = await hnCache.getCachedStories();
            
            if (cached && hnCache.isCacheFresh(cached.timestamp)) {
                console.log('Using fresh cached stories');
                // Cache is fresh - show immediately
                this.stories = cached.stories.slice(0, 20);
                this.displayStories();
                hnCache.updateDisplayTimestamp(cached.timestamp);
                return;
            }
            
            console.log('Cache is stale or empty, fetching fresh data...');
            
            // Step 2: Cache is stale/empty - show loading and fetch
            this.showLoading();
            this.hideError();

            // Step 3: Try to fetch from API with multiple fallback methods
            let stories = null;
            
            try {
                // Method 1: Try background script
                stories = await this.fetchStoriesWithRetry();
            } catch (error) {
                console.log('Background script method failed, trying direct fetch...');
                try {
                    // Method 2: Try direct fetch with CORS proxy
                    stories = await this.fetchStoriesWithProxy();
                } catch (proxyError) {
                    console.log('CORS proxy method failed, trying alternative proxy...');
                    try {
                        // Method 3: Try alternative CORS proxy
                        stories = await this.fetchStoriesWithAlternativeProxy();
                    } catch (altError) {
                        throw new Error(`All fetch methods failed. Last error: ${altError.message}`);
                    }
                }
            }
            
            if (stories && stories.length > 0) {
                console.log(`Successfully loaded ${stories.length} stories`);
                this.stories = stories.slice(0, 20);
                await hnCache.saveStoriesToCache(this.stories);
                this.displayStories();
            } else {
                throw new Error('No stories received from any method - empty response');
            }
            
        } catch (error) {
            console.error('Failed to load stories:', error);
            
            // Step 4: If all methods fail, try to show stale cache
            console.log('All fetch methods failed, checking for stale cache...');
            const cached = await hnCache.getCachedStories();
            if (cached && cached.stories && cached.stories.length > 0) {
                console.log('Showing stale cached stories');
                this.stories = cached.stories.slice(0, 20);
                this.displayStories();
                hnCache.updateDisplayTimestamp(cached.timestamp);
                this.showStaleDataWarning();
            } else {
                console.log('No cache available, showing sample stories');
                this.showSampleStories();
            }
        }
    }

    // Show sample stories when API is not available
    showSampleStories() {
        this.stories = [
            {
                id: 1,
                title: "Welcome to VU tech",
                by: "vutech",
                time: Date.now() / 1000,
                score: 100,
                url: "#",
                type: "story"
            },
            {
                id: 2,
                title: "Extension is working! Check your internet connection for live updates.",
                by: "system",
                time: Date.now() / 1000,
                score: 50,
                url: "#",
                type: "story"
            },
            {
                id: 3,
                title: "VU tech theme successfully applied with blue color scheme",
                by: "designer",
                time: Date.now() / 1000,
                score: 75,
                url: "#",
                type: "story"
            }
        ];
        this.displayStories();
        this.showOfflineMessage();
    }

    // Show offline message
    showOfflineMessage() {
        const messageDiv = document.createElement('div');
        const leftPanel = document.querySelector('.left-column');
        
        messageDiv.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(255, 165, 0, 0.3);
            max-width: 280px;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInFromRight 0.4s ease-out;
        `;
        messageDiv.textContent = '⚠️ Offline mode - showing sample stories';
        
        // Append to left panel instead of body
        if (leftPanel) {
            leftPanel.appendChild(messageDiv);
        } else {
            document.body.appendChild(messageDiv);
        }
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOutToRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }, 5000);
    }

    // Fetch stories with retry mechanism and timeout
    async fetchStoriesWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Fetch attempt ${attempt} for Hacker News stories...`);
                
                // Use background script to handle API calls
                const stories = await this.fetchStoriesViaBackground();
                if (stories && stories.length > 0) {
                    console.log(`Successfully fetched ${stories.length} story details`);
                    return stories;
                }
                
                throw new Error('No stories received from background script');
                
            } catch (error) {
                console.error(`Fetch attempt ${attempt} failed:`, error);
                
                if (attempt === maxRetries) {
                    throw new Error(`Failed to fetch stories after ${maxRetries} attempts. Last error: ${error.message}`);
                }
                
                // Wait before retry (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // This should never be reached, but just in case
        throw new Error('All retry attempts exhausted');
    }

    // Fetch stories via background script to avoid CORS issues
    async fetchStoriesViaBackground() {
        return new Promise((resolve, reject) => {
            // Set timeout for the message
            const timeout = setTimeout(() => {
                reject(new Error('Background script timeout'));
            }, 20000);

            // Send message to background script
            chrome.runtime.sendMessage({ type: 'FETCH_STORIES' }, (response) => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                    reject(new Error(`Background script error: ${chrome.runtime.lastError.message}`));
                    return;
                }
                
                if (response && response.success) {
                    resolve(response.stories);
                } else {
                    reject(new Error(response?.error || 'Unknown error from background script'));
                }
            });
        });
    }

    // Fallback method using CORS proxy
    async fetchStoriesWithProxy() {
        try {
            console.log('Trying CORS proxy method...');
            
            // Use a more reliable CORS proxy
            const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://hacker-news.firebaseio.com/v0/topstories.json');
            
                const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
                
            const response = await fetch(proxyUrl, {
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                    'Accept': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const responseText = await response.text();
            let storyIds;
            
            try {
                const data = JSON.parse(responseText);
                // Handle CORS proxy response format
                storyIds = data.contents ? JSON.parse(data.contents) : data;
            } catch (parseError) {
                storyIds = JSON.parse(responseText);
            }
                
                if (!Array.isArray(storyIds)) {
                throw new Error('Invalid response format - expected array of story IDs');
                }
            
            console.log(`Successfully fetched ${storyIds.length} story IDs via proxy`);
                
                // Get details for the first 20 stories
                const topStoryIds = storyIds.slice(0, 20);
                const stories = [];
                
                for (let i = 0; i < topStoryIds.length; i++) {
                    const storyId = topStoryIds[i];
                    try {
                    const story = await this.fetchStoryDetailsWithProxy(storyId);
                    if (story && story.title) {
                            stories.push(story);
                        }
                    // Small delay between requests to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                    console.warn(`Failed to fetch story ${storyId}:`, error.message);
                        // Continue with other stories
                    }
                }
                
            console.log(`Successfully fetched ${stories.length} story details via proxy`);
                return stories;
                
            } catch (error) {
            console.error('CORS proxy method failed:', error);
            throw error;
        }
    }

    // Alternative CORS proxy method
    async fetchStoriesWithAlternativeProxy() {
        try {
            console.log('Trying alternative CORS proxy method...');
            
            // Use a different CORS proxy
            const proxyUrl = 'https://thingproxy.freeboard.io/fetch/https://hacker-news.firebaseio.com/v0/topstories.json';
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const storyIds = await response.json();
            
            if (!Array.isArray(storyIds)) {
                throw new Error('Invalid response format - expected array of story IDs');
            }
            
            console.log(`Successfully fetched ${storyIds.length} story IDs via alternative proxy`);
            
            // Get details for the first 20 stories
            const topStoryIds = storyIds.slice(0, 20);
            const stories = [];
            
            for (let i = 0; i < topStoryIds.length; i++) {
                const storyId = topStoryIds[i];
                try {
                    const story = await this.fetchStoryDetailsWithProxy(storyId);
                    if (story && story.title) {
                        stories.push(story);
                    }
                    // Small delay between requests to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    console.warn(`Failed to fetch story ${storyId}:`, error.message);
                    // Continue with other stories
                }
            }
            
            console.log(`Successfully fetched ${stories.length} story details via alternative proxy`);
            return stories;
            
        } catch (error) {
            console.error('Alternative CORS proxy method failed:', error);
                    throw error;
        }
    }

    // Fetch story details with CORS proxy
    async fetchStoryDetailsWithProxy(storyId) {
        try {
            const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            
            const responseText = await response.text();
            let story;
            
            try {
                const data = JSON.parse(responseText);
                // Handle CORS proxy response format
                story = data.contents ? JSON.parse(data.contents) : data;
            } catch (parseError) {
                story = JSON.parse(responseText);
            }
            
            if (!story || !story.title) {
                throw new Error('Invalid story data received');
            }
            
            return story;
            
        } catch (error) {
            console.error(`Failed to fetch story ${storyId} via proxy:`, error);
            throw error;
        }
    }

    // Fetch individual story details
    async fetchStoryDetails(storyId) {
        try {
            let response;
            let usedProxy = false;
            
            try {
                // Try direct fetch first
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`, {
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
            } catch (directError) {
                usedProxy = true;
                
                // Try CORS proxy
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`)}`;
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                response = await fetch(proxyUrl, {
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch story ${storyId}: ${response.status} ${response.statusText}`);
            }
            
            const responseText = await response.text();
            let story;
            
            try {
                const data = JSON.parse(responseText);
                
                // Handle CORS proxy response format
                if (usedProxy && data.contents) {
                    story = JSON.parse(data.contents);
                } else {
                    story = data;
                }
                
            } catch (parseError) {
                story = JSON.parse(responseText);
            }
            
            // Validate story has required fields
            if (!story || !story.title) {
                throw new Error(`Invalid story data for ID ${storyId}`);
            }
            
            return story;
            
        } catch (error) {
            console.warn(`Failed to fetch story ${storyId}:`, error.message);
            return null;
        }
    }

    // Display stories in the UI
    displayStories() {
        const storiesContainer = document.getElementById('stories');
        const loadingElement = document.getElementById('loading');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        
        // Hide loading
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        if (storiesContainer) {
            storiesContainer.style.display = 'flex';
        }
        
        // Clear previous stories
        if (storiesContainer) {
            storiesContainer.innerHTML = '';
        }
        
        // Filter out any null stories (failed fetches)
        const validStories = this.stories.filter(story => story !== null);
        
        if (validStories.length === 0) {
            if (storiesContainer) storiesContainer.innerHTML = '<div class="error">No stories found</div>';
            return;
        }

        // Show initial stories (first 8)
        const initialStories = validStories.slice(0, 8);
        initialStories.forEach((story, index) => {
            const storyElement = this.createStoryElement(story);
            storiesContainer.appendChild(storyElement);
        });

        // Show load more button if there are more stories
        if (validStories.length > 8) {
            loadMoreBtn.style.display = 'block';
            this.remainingStories = validStories.slice(8);
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }

    // Load more stories
    loadMoreStories() {
        const storiesContainer = document.getElementById('stories');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        
        if (!this.remainingStories || this.remainingStories.length === 0) {
            loadMoreBtn.style.display = 'none';
            return;
        }

        // Load next 4 stories
        const nextStories = this.remainingStories.slice(0, 4);
        nextStories.forEach((story, index) => {
            const storyElement = this.createStoryElement(story);
            storiesContainer.appendChild(storyElement);
        });

        // Update remaining stories
        this.remainingStories = this.remainingStories.slice(4);

        // Hide button if no more stories
        if (this.remainingStories.length === 0) {
            loadMoreBtn.style.display = 'none';
        }
    }

    // Create HTML element for a single story
    createStoryElement(story) {
        const storyDiv = document.createElement('div');
        storyDiv.className = 'story';
        
        // Set data attributes for sorting
        storyDiv.setAttribute('data-score', story.score || 0);
        storyDiv.setAttribute('data-time', story.time ? new Date(story.time * 1000).toISOString() : new Date().toISOString());
        storyDiv.setAttribute('data-comments', story.descendants || 0);
        
        // Format the time
        const timeAgo = this.formatTimeAgo(story.time);
        
        // Determine category and trending status
        const category = this.getStoryCategory(story);
        const isTrending = this.isStoryTrending(story);
        
        // Create the HTML structure - always show both Save and Read Later buttons
        storyDiv.innerHTML = `
            <div class="story-header">
                <span class="story-category ${category.toLowerCase()}">${category}</span>
                ${isTrending ? '<span class="trending-badge">Trending</span>' : ''}
            </div>
            <div class="story-title">
                <a href="${story.url || `https://news.ycombinator.com/item?id=${story.id}`}" 
                   rel="noopener noreferrer">
                    ${story.title || 'No title'}
                </a>
            </div>
            <div class="story-meta">
                <span class="story-author">by ${story.by || 'unknown'}</span>
                <span class="story-time">${timeAgo}</span>
            </div>
            <div class="story-engagement">
                <div class="engagement-item">
                    <svg class="engagement-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                    <span>${story.descendants || 0}</span>
                </div>
                <div class="engagement-item">
                    <svg class="engagement-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14l5-5 5 5z"/>
                        <path d="M0 0h24v24H0z" fill="none"/>
                    </svg>
                    <span>${this.formatViewCount(story.score || 0)}</span>
                </div>
            </div>
            <div class="story-actions" data-story-id="${story.id}">
                <button class="action-btn read-later-btn" data-action="read-later" title="Read later">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>Read Later</span>
                </button>
            </div>
        `;
        
        return storyDiv;
    }

    // Get story category based on URL, title, or content
    getStoryCategory(story) {
        // Simple categorization - just return HACKER NEWS for all stories
        return 'HACKER NEWS';
        
        /* Advanced categorization (commented out for now)
        const title = (story.title || '').toLowerCase();
        const url = (story.url || '').toLowerCase();
        
        // Check for Ask HN posts
        if (title.startsWith('ask hn:') || !story.url) return 'ASK HN';
        
        // Check for Show HN posts
        if (title.startsWith('show hn:')) return 'SHOW HN';
        
        // AI/ML related
        if (title.includes('ai') || title.includes('artificial intelligence') || 
            title.includes('machine learning') || title.includes('neural') ||
            title.includes('llm') || title.includes('gpt') || title.includes('openai')) {
            return 'AI';
        }
        
        // Programming/Development
        if (title.includes('programming') || title.includes('coding') || 
            title.includes('developer') || title.includes('software') ||
            title.includes('javascript') || title.includes('python') || 
            title.includes('react') || title.includes('node') ||
            url.includes('github.com') || url.includes('stackoverflow.com')) {
            return 'DEV';
        }
        
        // Technology
        if (title.includes('tech') || title.includes('technology') || 
            title.includes('startup') || title.includes('business') ||
            title.includes('company') || title.includes('funding')) {
            return 'TECH';
        }
        
        // Security
        if (title.includes('security') || title.includes('hack') || 
            title.includes('vulnerability') || title.includes('breach') ||
            title.includes('crypto') || title.includes('bitcoin') || 
            title.includes('blockchain')) {
            return 'SECURITY';
        }
        
        // Science
        if (title.includes('science') || title.includes('research') || 
            title.includes('study') || title.includes('university') ||
            title.includes('space') || title.includes('physics') ||
            title.includes('biology') || title.includes('chemistry')) {
            return 'SCIENCE';
        }
        
        return 'HACKER NEWS';
        */
    }

    // Check if story is trending (high score or recent)
    isStoryTrending(story) {
        const score = story.score || 0;
        const timeAgo = Date.now() / 1000 - story.time;
        const hoursAgo = timeAgo / 3600;
        
        // More sophisticated trending logic
        if (score >= 500) return true; // Very high score
        if (score >= 200 && hoursAgo < 6) return true; // High score + recent
        if (score >= 100 && hoursAgo < 2) return true; // Good score + very recent
        if (score >= 50 && hoursAgo < 1) return true; // Decent score + just posted
        
        return false;
    }

    // Format view count for display
    formatViewCount(score) {
        if (score >= 1000) {
            return (score / 1000).toFixed(1) + 'k';
        }
        return score.toString();
    }

    // Format timestamp to "X hours ago"
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
                ? 'New tab override enabled! New tabs will show VU tech.'
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

    // UI state management
    showLoading() {
        const loadingElement = document.getElementById('loading');
        const storiesElement = document.getElementById('stories');
        const errorElement = document.getElementById('error');
        
        if (loadingElement) {
            loadingElement.style.display = 'block';
            this.createCrazyLoadingEffects();
        }
        if (storiesElement) storiesElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';
    }

    // Create professional loading effects
    createCrazyLoadingEffects() {
        const loadingElement = document.getElementById('loading');
        if (!loadingElement) return;

        // Clear any existing loading content
        loadingElement.innerHTML = '';

        // Create professional loading container
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'professional-loader';
        
        // Create main spinner
        const spinner = document.createElement('div');
        spinner.className = 'professional-spinner';
        
        // Create loading text
        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text';
        loadingText.textContent = 'Loading latest news...';
        
        // Create progress dots
        const progressDots = document.createElement('div');
        progressDots.className = 'progress-dots';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'progress-dot';
            dot.style.animationDelay = `${i * 0.2}s`;
            progressDots.appendChild(dot);
        }
        
        loadingContainer.appendChild(spinner);
        loadingContainer.appendChild(loadingText);
        loadingContainer.appendChild(progressDots);
        loadingElement.appendChild(loadingContainer);
    }

    showError(errorMessage = 'Failed to load stories. Please check your internet connection and try again.') {
        const loadingElement = document.getElementById('loading');
        const storiesElement = document.getElementById('stories');
        const errorElement = document.getElementById('error');
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (storiesElement) storiesElement.style.display = 'none';
        if (errorElement) {
            errorElement.style.display = 'block';
            errorElement.textContent = errorMessage;
        }
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }

    // Initialize Chrome functionality
    initChromeFunctionality() {
        // Wait for DOM to be fully loaded
        setTimeout(() => {
            // Search functionality
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const query = searchInput.value.trim();
                        if (query) {
                            // Check if it's a valid URL or domain
                            if (this.isValidUrl(query)) {
                                // Add protocol if missing
                                const url = query.startsWith('http') ? query : `https://${query}`;
                                window.location.href = url;
                            } else {
                                // Treat as search query
                                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                            }
                        }
                    }
                });
                
                // Focus search on page load
                searchInput.focus();
            }

            // Quick links functionality
            const shortcutCards = document.querySelectorAll('.shortcut-card');
            shortcutCards.forEach(card => {
                card.addEventListener('click', () => {
                    const url = card.getAttribute('data-url');
                    if (url) {
                        window.location.href = url;
                    }
                });
            });

            // Voice search functionality
            const voiceSearch = document.querySelector('.voice-search');
            if (voiceSearch) {
                voiceSearch.addEventListener('click', () => {
                    if (searchInput) {
                        searchInput.focus();
                    }
                });
            }

            // Lens search functionality
            const lensSearch = document.querySelector('.lens-search');
            if (lensSearch) {
                lensSearch.addEventListener('click', () => {
                    if (searchInput) {
                        searchInput.focus();
                    }
                });
            }
        }, 100);
    }

    // Helper function to check if input is a valid URL
    isValidUrl(string) {
        // First, try to parse as a complete URL
        try {
            new URL(string);
            return true;
        } catch (_) {
            // If that fails, check if it looks like a domain name with TLD
            // Must have a dot and valid TLD (at least 2 characters)
            const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
            
            // Additional check: make sure it's not a common search term
            const commonSearchTerms = [
                'chatgpt', 'youtube', 'facebook', 'twitter', 'instagram', 'linkedin',
                'reddit', 'github', 'stackoverflow', 'wikipedia', 'amazon', 'netflix',
                'spotify', 'discord', 'slack', 'zoom', 'teams', 'whatsapp', 'telegram'
            ];
            
            const isCommonSearchTerm = commonSearchTerms.includes(string.toLowerCase());
            
            return domainPattern.test(string) && !isCommonSearchTerm;
        }
    }

    // Toggle panel minimize/expand (updated for new structure)
    toggleWidget() {
        const panel = document.getElementById('technewsPanel');
        const toggleBtn = document.querySelector('.action-btn[title="Minimize"]') || document.querySelector('.action-btn[title="Expand"]');
        
        if (panel.classList.contains('minimized')) {
            panel.classList.remove('minimized');
            if (toggleBtn) {
                toggleBtn.textContent = '−';
                toggleBtn.title = 'Minimize';
            }
        } else {
            panel.classList.add('minimized');
            if (toggleBtn) {
                toggleBtn.textContent = '+';
                toggleBtn.title = 'Expand';
            }
        }
    }

    // Add Shortcut Modal Functions
    openAddShortcutModal() {
        const modal = document.getElementById('addShortcutModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus on the name input
        setTimeout(() => {
            document.getElementById('shortcutName').focus();
        }, 100);
    }

    closeAddShortcutModal() {
        const modal = document.getElementById('addShortcutModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Custom URL Modal Functions
    openCustomUrlModal() {
        const modal = document.getElementById('customUrlModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Focus on the name input
        setTimeout(() => {
            document.getElementById('shortcutName').focus();
        }, 100);
    }

    closeCustomUrlModal() {
        const modal = document.getElementById('customUrlModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Clear form
        document.getElementById('shortcutName').value = '';
        document.getElementById('shortcutUrl').value = '';
        document.getElementById('shortcutIcon').value = 'default';
    }

    // Quick Shortcut Functions
    async addQuickShortcut(name, url, service) {
        try {
            // Get existing custom shortcuts
            const result = await chrome.storage.sync.get(['customShortcuts']);
            const customShortcuts = result.customShortcuts || [];
            
            // Check if shortcut already exists
            const exists = customShortcuts.some(shortcut => shortcut.url === url);
            if (exists) {
                this.showSuccessMessage(`${name} is already added!`);
                this.closeAddShortcutModal();
                return;
            }
            
            // Add new shortcut
            const newShortcut = {
                id: Date.now(),
                name: name,
                url: url,
                icon: service
            };
            
            customShortcuts.push(newShortcut);
            
            // Save to storage
            await chrome.storage.sync.set({ customShortcuts: customShortcuts });
            
            // Add to UI
            this.addShortcutToUI(newShortcut);
            
            // Close modal
            this.closeAddShortcutModal();
            
            // Show success message
            this.showSuccessMessage(`${name} added successfully!`);
            
        } catch (error) {
            alert('Failed to save shortcut. Please try again.');
        }
    }

    async saveCustomShortcut() {
        const name = document.getElementById('shortcutName').value.trim();
        const url = document.getElementById('shortcutUrl').value.trim();
        const icon = document.getElementById('shortcutIcon').value;

        if (!name || !url) {
            alert('Please fill in both name and URL fields.');
            return;
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            alert('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        try {
            // Get existing custom shortcuts
            const result = await chrome.storage.sync.get(['customShortcuts']);
            const customShortcuts = result.customShortcuts || [];
            
            // Add new shortcut
            const newShortcut = {
                id: Date.now(),
                name: name,
                url: url,
                icon: icon
            };
            
            customShortcuts.push(newShortcut);
            
            // Save to storage
            await chrome.storage.sync.set({ customShortcuts: customShortcuts });
            
            // Add to UI
            this.addShortcutToUI(newShortcut);
            
            // Close both modals
            this.closeCustomUrlModal();
            this.closeAddShortcutModal();
            
            // Show success message
            this.showSuccessMessage('Shortcut added successfully!');
            
        } catch (error) {
            alert('Failed to save shortcut. Please try again.');
        }
    }

    addShortcutToUI(shortcut) {
        const shortcutsGrid = document.querySelector('.shortcuts-grid');
        const addButton = document.getElementById('addShortcutBtn');
        
        // Create new shortcut element
        const shortcutCard = document.createElement('div');
        shortcutCard.className = 'shortcut-card';
        shortcutCard.setAttribute('data-url', shortcut.url);
        shortcutCard.setAttribute('data-shortcut-id', shortcut.id);
        
        // Get icon SVG based on selection
        const iconSvg = this.getIconSvg(shortcut.icon);
        
        shortcutCard.innerHTML = `
            <div class="shortcut-icon">
                ${iconSvg}
            </div>
            <div class="shortcut-name">${shortcut.name}</div>
            <div class="remove-shortcut-btn" title="Remove shortcut">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </div>
        `;
        
        // Add click event for navigation
        shortcutCard.addEventListener('click', (e) => {
            // Don't navigate if clicking the remove button
            if (!e.target.closest('.remove-shortcut-btn')) {
                window.location.href = shortcut.url;
            }
        });
        
        // Add remove button click event
        const removeBtn = shortcutCard.querySelector('.remove-shortcut-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeShortcut(shortcut.id, shortcut.name);
        });
        
        // Insert before the add button
        shortcutsGrid.insertBefore(shortcutCard, addButton);
    }

    getIconSvg(iconType) {
        const icons = {
            default: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#888"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
            calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#4285f4"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>',
            photos: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ea4335"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
            maps: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#34a853"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
            shopping: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#34a853"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
            news: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ea4335"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>',
            translate: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#4285f4"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>',
            github: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#333"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
            netflix: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#e50914"><path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.549.002-22.95zM5.398 0C2.35 0 0 2.35 0 5.398v13.204C0 21.65 2.35 24 5.398 24c3.048 0 5.398-2.35 5.398-5.398V5.398C10.796 2.35 8.446 0 5.398 0z"/></svg>',
            spotify: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#1db954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
            twitter: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#1da1f2"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>',
            linkedin: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#0077b5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
            instagram: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#e4405f"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
            discord: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
            slack: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#4a154b"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>',
            zoom: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#2d8cff"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 3.46-2.128 4.692-1.232 1.232-2.834 1.959-4.692 2.128-1.858.169-3.46.896-4.692 2.128-1.232 1.232-1.959 2.834-2.128 4.692-.169 1.858-.896 3.46-2.128 4.692-1.232 1.232-2.834 1.959-4.692 2.128C.896 22.432.169 24.034 0 25.892v-1.732c.169-1.858.896-3.46 2.128-4.692 1.232-1.232 2.834-1.959 4.692-2.128 1.858-.169 3.46-.896 4.692-2.128 1.232-1.232 1.959-2.834 2.128-4.692.169-1.858.896-3.46 2.128-4.692 1.232-1.232 2.834-1.959 4.692-2.128z"/></svg>',
            figma: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#f24e1e"><path d="M12 12c0-3.04 2.46-5.5 5.5-5.5S23 8.96 23 12s-2.46 5.5-5.5 5.5S12 15.04 12 12zM12 12c0 3.04-2.46 5.5-5.5 5.5S1 15.04 1 12s2.46-5.5 5.5-5.5S12 8.96 12 12zM12 12c-3.04 0-5.5-2.46-5.5-5.5S8.96 1 12 1s5.5 2.46 5.5 5.5S15.04 12 12 12z"/></svg>',
            notion: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#000000"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.033-.794c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.747.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.68-1.632z"/></svg>'
        };
        
        return icons[iconType] || icons.default;
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    async loadCustomShortcuts() {
        try {
            const result = await chrome.storage.sync.get(['customShortcuts']);
            const customShortcuts = result.customShortcuts || [];
            
            // Add each custom shortcut to the UI
            customShortcuts.forEach(shortcut => {
                this.addShortcutToUI(shortcut);
            });
        } catch (error) {
            console.error('Failed to load custom shortcuts:', error);
        }
    }

    async removeShortcut(shortcutId, shortcutName) {
        // Show confirmation dialog
        if (!confirm(`Are you sure you want to remove "${shortcutName}"?`)) {
            return;
        }

        try {
            // Get existing custom shortcuts
            const result = await chrome.storage.sync.get(['customShortcuts']);
            const customShortcuts = result.customShortcuts || [];
            
            // Remove the shortcut from the array
            const updatedShortcuts = customShortcuts.filter(shortcut => shortcut.id !== shortcutId);
            
            // Save updated shortcuts
            await chrome.storage.sync.set({ customShortcuts: updatedShortcuts });
            
            // Remove from UI
            const shortcutElement = document.querySelector(`[data-shortcut-id="${shortcutId}"]`);
            if (shortcutElement) {
                shortcutElement.remove();
            }
            
            // Show success message
            this.showSuccessMessage(`${shortcutName} removed successfully!`);
            
        } catch (error) {
            alert('Failed to remove shortcut. Please try again.');
        }
    }

    // Show stale data warning
    showStaleDataWarning() {
        // Create a temporary warning message
        const warningDiv = document.createElement('div');
        const leftPanel = document.querySelector('.left-column');
        
        warningDiv.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(255, 165, 0, 0.3);
            max-width: 280px;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInFromRight 0.4s ease-out;
        `;
        warningDiv.textContent = '⚠️ Showing cached data (offline mode)';
        
        // Append to left panel instead of body
        if (leftPanel) {
            leftPanel.appendChild(warningDiv);
        } else {
            document.body.appendChild(warningDiv);
        }
        
        setTimeout(() => {
            warningDiv.style.animation = 'slideOutToRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (warningDiv.parentNode) {
                    warningDiv.remove();
                }
            }, 300);
        }, 5000);
    }

    // Listen for background updates
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'STORIES_UPDATED') {
                this.stories = message.stories.slice(0, 20); // New tab shows up to 20 stories
                this.displayStories();
                
                // Update timestamp with real update time
                if (message.timestamp) {
                    hnCache.updateDisplayTimestamp(message.timestamp);
                }
                
                // Show subtle update notification
                this.showUpdateNotification();
            }
        });
    }

    // Show update notification
    showUpdateNotification() {
        const notificationDiv = document.createElement('div');
        const leftPanel = document.querySelector('.left-column');
        
        notificationDiv.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
            max-width: 280px;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInFromRight 0.4s ease-out;
        `;
        notificationDiv.textContent = '✅ Stories updated in background';
        
        // Append to left panel instead of body
        if (leftPanel) {
            leftPanel.appendChild(notificationDiv);
        } else {
            document.body.appendChild(notificationDiv);
        }
        
        setTimeout(() => {
            notificationDiv.style.animation = 'slideOutToRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notificationDiv.parentNode) {
                    notificationDiv.remove();
                }
            }, 300);
        }, 3000);
    }

    // Force refresh (clear cache and fetch fresh data)
    async forceRefresh() {
        try {
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
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 16px rgba(23, 162, 184, 0.3);
            max-width: 300px;
        `;
        successDiv.textContent = '🔄 Cache cleared & refreshed';
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // Start live updates for timestamp
    startLiveUpdates() {
        this.updateTimestamp();
        // Update every minute
        setInterval(() => {
            this.updateTimestamp();
        }, 60000);
    }

    // Update the live timestamp with real cache time
    async updateTimestamp() {
        const cached = await hnCache.getCachedStories();
        if (cached && cached.timestamp) {
            hnCache.updateDisplayTimestamp(cached.timestamp);
        }
    }

    // ==================== AUTHENTICATION METHODS ====================

    // Setup authentication event listeners
    setupAuthEventListeners() {
        // Header auth buttons
        const loginBtnHeader = document.getElementById('loginBtnHeader');
        const registerBtnHeader = document.getElementById('registerBtnHeader');
        const userMenuBtn = document.getElementById('userMenuBtn');

        if (loginBtnHeader) {
            loginBtnHeader.addEventListener('click', () => this.showAuthModal('login'));
        }
        if (registerBtnHeader) {
            registerBtnHeader.addEventListener('click', () => this.showAuthModal('register'));
        }
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', () => this.showProfileModal());
        }

        // Auth modal buttons
        const closeAuthModal = document.getElementById('closeAuthModal');
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');

        if (closeAuthModal) {
            closeAuthModal.addEventListener('click', () => this.hideAuthModal());
        }
        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthForm('register');
            });
        }
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthForm('login');
            });
        }
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.handleRegister());
        }

        // Profile modal buttons
        const closeProfileModal = document.getElementById('closeProfileModal');
        const logoutBtn = document.getElementById('logoutBtn');
        const viewSavedBtn = document.getElementById('viewSavedBtn');
        const viewReadLaterBtn = document.getElementById('viewReadLaterBtn');

        if (closeProfileModal) {
            closeProfileModal.addEventListener('click', () => this.hideProfileModal());
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        if (viewSavedBtn) {
            viewSavedBtn.addEventListener('click', () => this.viewSavedArticles());
        }
        if (viewReadLaterBtn) {
            viewReadLaterBtn.addEventListener('click', () => this.viewReadLaterArticles());
        }

        // Articles modal buttons
        const closeArticlesModal = document.getElementById('closeArticlesModal');
        const retryLoadArticles = document.getElementById('retryLoadArticles');
        const articlesTabs = document.querySelectorAll('.articles-tab');
        
        if (closeArticlesModal) {
            closeArticlesModal.addEventListener('click', () => {
                const modal = document.getElementById('articlesModal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        const articlesModal = document.getElementById('articlesModal');
        if (articlesModal) {
            articlesModal.addEventListener('click', (e) => {
                if (e.target === articlesModal) {
                    articlesModal.style.display = 'none';
                }
            });
        }
        
        // Tab switching
        articlesTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const type = tab.getAttribute('data-type');
                if (type) {
                    // Update active tab
                    articlesTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Update modal title
                    const title = document.getElementById('articlesModalTitle');
                    if (title) {
                        title.textContent = type === 'saved' ? 'Saved Articles' : 'Read Later';
                    }
                    
                    // Load articles for this type
                    this.loadArticles(type);
                }
            });
        });
        
        // Retry button
        if (retryLoadArticles) {
            retryLoadArticles.addEventListener('click', () => {
                const activeTab = document.querySelector('.articles-tab.active');
                const type = activeTab?.getAttribute('data-type') || 'read-later';
                this.loadArticles(type);
            });
        }

        // Story action buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.story-actions .action-btn')) {
                const btn = e.target.closest('.action-btn');
                const action = btn.getAttribute('data-action');
                const storyId = btn.closest('.story-actions').getAttribute('data-story-id');
                const story = this.stories.find(s => s.id.toString() === storyId);
                
                if (story) {
                    if (action === 'read-later') {
                        this.handleReadLater(story);
                    }
                }
            }
        });

        // Check authentication status on load
        this.checkAuthStatus();

        // Set up session persistence handlers
        this.setupSessionPersistence();
    }

    // Setup auth icon event listener
    setupAuthIconListener() {
        const authIconBtn = document.getElementById('authIconBtn');
        if (authIconBtn) {
            authIconBtn.addEventListener('click', async () => {
                // Check if user is logged in
                const result = await chrome.storage.local.get(['userToken']);
                if (result.userToken) {
                    // User is logged in - show profile modal
                    this.showProfileModal();
                } else {
                    // User is not logged in - show auth modal
                    this.showAuthModal('login');
                }
            });
        }
    }

    // Show authentication modal
    showAuthModal(type = 'login') {
        const modal = document.getElementById('authModal');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authTitle = document.getElementById('authTitle');

        if (modal) {
            modal.style.display = 'flex';
            this.switchAuthForm(type);
        }
    }

    // Hide authentication modal
    hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearAuthForms();
        }
    }

    // Switch between login and register forms
    switchAuthForm(type) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authTitle = document.getElementById('authTitle');

        if (type === 'login') {
            if (loginForm) loginForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
            if (authTitle) authTitle.textContent = 'Sign In';
        } else {
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'block';
            if (authTitle) authTitle.textContent = 'Create Account';
        }
    }

    // Clear authentication forms
    clearAuthForms() {
        const inputs = document.querySelectorAll('#authModal input');
        inputs.forEach(input => input.value = '');
        this.hideAuthError();
    }

    // Show authentication error
    showAuthError(message) {
        const errorDiv = document.getElementById('authError');
        const errorMessage = document.getElementById('authErrorMessage');
        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    // Hide authentication error
    hideAuthError() {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    // Show loading state
    showAuthLoading() {
        const loadingDiv = document.getElementById('authLoading');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loadingDiv) loadingDiv.style.display = 'flex';
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';
    }

    // Hide loading state
    hideAuthLoading() {
        const loadingDiv = document.getElementById('authLoading');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    // Handle login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }

        this.showAuthLoading();
        this.hideAuthError();

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                mode: 'cors'
            });

            const data = await response.json();

            if (data.success) {
                // Store user data and token
                await chrome.storage.local.set({
                    userToken: data.data.token,
                    userData: data.data.user
                });

                this.updateUserInterface(data.data.user);
                this.hideAuthModal();
                this.showNotification('Welcome back!', 'success');
            } else {
                this.showAuthError(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                this.showAuthError('Network error: Unable to connect to the server. Please check your internet connection and ensure the backend server is running on localhost:3000');
            } else {
                this.showAuthError(`Login failed: ${error.message}`);
            }
        } finally {
            this.hideAuthLoading();
        }
    }

    // Handle register
    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!name || !email || !password || !confirmPassword) {
            this.showAuthError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            this.showAuthError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters');
            return;
        }

        this.showAuthLoading();
        this.hideAuthError();

        try {
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
                mode: 'cors'
            });

            const data = await response.json();

            if (data.success) {
                // Store user data and token
                await chrome.storage.local.set({
                    userToken: data.data.token,
                    userData: data.data.user
                });

                this.updateUserInterface(data.data.user);
                this.hideAuthModal();
                this.showNotification('Account created successfully!', 'success');
            } else {
                this.showAuthError(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Register error:', error);
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                this.showAuthError('Network error: Unable to connect to the server. Please check your internet connection and ensure the backend server is running on localhost:3000');
            } else {
                this.showAuthError(`Registration failed: ${error.message}`);
            }
        } finally {
            this.hideAuthLoading();
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            // Clear stored data
            await chrome.storage.local.remove(['userToken', 'userData']);
            
            // Update UI
            this.updateUserInterface(null);
            this.hideProfileModal();
            this.showNotification('Signed out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Check authentication status
    async checkAuthStatus() {
        try {
            console.log('Checking authentication status...');
            const result = await chrome.storage.local.get(['userToken', 'userData']);
            
            if (result.userToken && result.userData) {
                console.log('Found stored user data, verifying token...');
                // Verify token is still valid
                const isValid = await this.verifyToken(result.userToken);
                if (isValid) {
                    console.log('Token is valid, user is logged in');
                    this.updateUserInterface(result.userData);
                    // Optionally refresh user data from server
                    await this.refreshUserData();
                } else {
                    console.log('Token expired or invalid, clearing stored data');
                    // Token expired, clear data
                    await chrome.storage.local.remove(['userToken', 'userData']);
                    this.updateUserInterface(null);
                }
            } else {
                console.log('No stored user data found');
                this.updateUserInterface(null);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // On error, assume not logged in
            this.updateUserInterface(null);
        }
    }

    // Helper function to check if user is logged in
    async isUserLoggedIn() {
        try {
            const result = await chrome.storage.local.get(['userToken']);
            return !!result.userToken;
        } catch (error) {
            console.error('Error checking login status:', error);
            return false;
        }
    }

    // Verify token with backend
    async verifyToken(token) {
        try {
            const response = await fetch('http://localhost:3000/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                mode: 'cors'
            });

            return response.ok;
        } catch (error) {
            console.log('Token verification failed (server might be unavailable):', error.message);
            // If server is unavailable, assume token is still valid for offline use
            // This prevents users from being logged out when server is temporarily down
            return true;
        }
    }

    // Refresh user data from server
    async refreshUserData() {
        try {
            const result = await chrome.storage.local.get(['userToken']);
            if (!result.userToken) return;

            const response = await fetch('http://localhost:3000/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${result.userToken}`
                },
                mode: 'cors'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.user) {
                    // Update stored user data with fresh data from server
                    await chrome.storage.local.set({
                        userData: data.data.user
                    });
                    // Update UI with fresh data
                    this.updateUserInterface(data.data.user);
                    console.log('User data refreshed from server');
                }
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    }

    // Setup session persistence handlers
    setupSessionPersistence() {
        // Listen for storage changes (when user logs in/out in another tab)
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.userToken || changes.userData) {
                    console.log('User authentication state changed, updating UI...');
                    this.checkAuthStatus();
                }
            }
        });

        // Listen for page visibility changes (when user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('Page became visible, checking auth status...');
                this.checkAuthStatus();
            }
        });

        // Listen for focus events (when user returns to browser)
        window.addEventListener('focus', () => {
            console.log('Window focused, checking auth status...');
            this.checkAuthStatus();
        });

        // Periodic auth check (every 5 minutes) to ensure session stays fresh
        setInterval(() => {
            console.log('Periodic auth check...');
            this.checkAuthStatus();
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Update user interface based on auth status
    updateUserInterface(user) {
        const userInfo = document.getElementById('userInfo');
        const authActions = document.getElementById('authActions');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userInitials = document.getElementById('userInitials');

        // Profile modal elements
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileInitials = document.getElementById('profileInitials');
        const profileJoined = document.getElementById('profileJoined');
        const profileLastLogin = document.getElementById('profileLastLogin');

        if (user) {
            // User is logged in
            if (userInfo) userInfo.style.display = 'flex';
            if (authActions) authActions.style.display = 'none';
            
            // Update header elements
            if (userName) userName.textContent = user.name;
            if (userEmail) userEmail.textContent = user.email;
            if (userInitials) {
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                userInitials.textContent = initials;
            }

            // Update profile modal elements
            if (profileName) profileName.textContent = user.name;
            if (profileEmail) profileEmail.textContent = user.email;
            if (profileInitials) {
                const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                profileInitials.textContent = initials;
            }

            // Update profile meta information
            if (profileJoined && user.createdAt) {
                const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                profileJoined.textContent = joinedDate;
            }

            if (profileLastLogin && user.lastLogin) {
                const lastLoginDate = new Date(user.lastLogin).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                profileLastLogin.textContent = lastLoginDate;
            }
        } else {
            // User is not logged in
            if (userInfo) userInfo.style.display = 'none';
            if (authActions) authActions.style.display = 'flex';
        }
    }

    // Show profile modal
    showProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadUserStats();
        }
    }

    // Hide profile modal
    hideProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Load user statistics
    async loadUserStats() {
        try {
            const result = await chrome.storage.local.get(['userToken']);
            if (!result.userToken) return;

            const [savedResponse, readLaterResponse] = await Promise.all([
                fetch('http://localhost:3000/api/articles/saved', {
                    headers: { 'Authorization': `Bearer ${result.userToken}` },
                    mode: 'cors'
                }),
                fetch('http://localhost:3000/api/articles/read-later', {
                    headers: { 'Authorization': `Bearer ${result.userToken}` },
                    mode: 'cors'
                })
            ]);

            const savedData = await savedResponse.json();
            const readLaterData = await readLaterResponse.json();

            const savedCount = document.getElementById('savedCount');
            const readLaterCount = document.getElementById('readLaterCount');

            if (savedCount) savedCount.textContent = savedData.data?.pagination?.total || 0;
            if (readLaterCount) readLaterCount.textContent = readLaterData.data?.pagination?.total || 0;
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    // Handle save article
    async handleSaveArticle(story) {
        try {
            const result = await chrome.storage.local.get(['userToken']);
            if (!result.userToken) {
                this.showAuthModal('login');
                return;
            }

            const response = await fetch('http://localhost:3000/api/articles/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.userToken}`
                },
                body: JSON.stringify({
                    storyId: story.id.toString(),
                    title: story.title,
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    type: 'saved',
                    score: story.score || 0,
                    author: story.by || 'unknown',
                    comments: story.descendants || 0
                }),
                mode: 'cors'
            });

            const data = await response.json();

            if (data.success) {
                this.updateStoryButton(story.id, 'save', true);
                this.showNotification('Article saved!', 'success');
            } else {
                this.showNotification(data.message || 'Failed to save article', 'error');
            }
        } catch (error) {
            console.error('Save article error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    // Handle read later
    async handleReadLater(story) {
        try {
            const result = await chrome.storage.local.get(['userToken']);
            if (!result.userToken) {
                this.showAuthModal('login');
                return;
            }

            const response = await fetch('http://localhost:3000/api/articles/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.userToken}`
                },
                body: JSON.stringify({
                    storyId: story.id.toString(),
                    title: story.title,
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    type: 'read-later',
                    score: story.score || 0,
                    author: story.by || 'unknown',
                    comments: story.descendants || 0
                }),
                mode: 'cors'
            });

            const data = await response.json();

            if (data.success) {
                this.updateStoryButton(story.id, 'read-later', true);
                this.showNotification('Added to read later!', 'success');
            } else {
                this.showNotification(data.message || 'Failed to add to read later', 'error');
            }
        } catch (error) {
            console.error('Read later error:', error);
            this.showNotification('Network error. Please try again.', 'error');
        }
    }

    // Update story button state
    updateStoryButton(storyId, action, isActive) {
        const storyActions = document.querySelector(`[data-story-id="${storyId}"]`);
        if (storyActions) {
            const btn = storyActions.querySelector(`[data-action="${action}"]`);
            if (btn) {
                if (isActive) {
                    btn.classList.add(action === 'save' ? 'saved' : 'read-later-saved');
                    btn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        <span>${action === 'save' ? 'Saved' : 'Added'}</span>
                    `;
                } else {
                    btn.classList.remove('saved', 'read-later-saved');
                    btn.innerHTML = `
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                        </svg>
                        <span>${action === 'save' ? 'Save' : 'Read Later'}</span>
                    `;
                }
            }
        }
    }

    // View saved articles
    viewSavedArticles() {
        this.showArticlesModal('saved');
    }

    // View read later articles
    viewReadLaterArticles() {
        this.showArticlesModal('read-later');
    }

    // Show articles modal with specified type
    async showArticlesModal(type = 'read-later') {
        const modal = document.getElementById('articlesModal');
        const title = document.getElementById('articlesModalTitle');
        const tabs = document.querySelectorAll('.articles-tab');
        
        if (!modal) return;
        
        // Update modal title
        title.textContent = type === 'saved' ? 'Saved Articles' : 'Read Later';
        
        // Update active tab
        tabs.forEach(tab => {
            if (tab.getAttribute('data-type') === type) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close profile modal if open
        this.hideProfileModal();
        
        // Load articles
        await this.loadArticles(type);
    }

    // Load articles from backend
    async loadArticles(type) {
        const loadingEl = document.getElementById('articlesLoading');
        const listEl = document.getElementById('articlesList');
        const emptyEl = document.getElementById('articlesEmpty');
        const errorEl = document.getElementById('articlesError');
        const emptyMessage = document.getElementById('emptyMessage');
        
        // Show loading, hide others
        loadingEl.style.display = 'flex';
        listEl.style.display = 'none';
        emptyEl.style.display = 'none';
        errorEl.style.display = 'none';
        
        try {
            const result = await chrome.storage.local.get(['userToken']);
            if (!result.userToken) {
                throw new Error('Not authenticated');
            }
            
            const endpoint = type === 'saved' ? 'saved' : 'read-later';
            const response = await fetch(`http://localhost:3000/api/articles/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${result.userToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch articles');
            }
            
            const data = await response.json();
            const articles = data.data?.articles || [];
            
            // Hide loading
            loadingEl.style.display = 'none';
            
            if (articles.length === 0) {
                // Show empty state
                emptyEl.style.display = 'flex';
                emptyMessage.textContent = type === 'saved' 
                    ? 'You haven\'t saved any articles yet.' 
                    : 'You haven\'t added any articles to read later.';
            } else {
                // Show articles list
                listEl.style.display = 'flex';
                this.renderArticlesList(articles, type);
            }
            
        } catch (error) {
            console.error('Failed to load articles:', error);
            loadingEl.style.display = 'none';
            errorEl.style.display = 'flex';
        }
    }

    // Render articles list
    renderArticlesList(articles, type) {
        const listEl = document.getElementById('articlesList');
        listEl.innerHTML = '';
        
        articles.forEach(article => {
            const articleEl = document.createElement('div');
            articleEl.className = 'article-item';
            articleEl.setAttribute('data-article-id', article._id);
            articleEl.setAttribute('data-article-type', article.type || type);
            
            // Calculate time ago
            const timeAgo = this.getTimeAgo(article.savedAt);
            
            // Determine save button text based on current type
            const currentType = article.type || type;
            const saveButtonText = currentType === 'read-later' ? 'Save' : 'Read Later';
            const saveButtonAction = currentType === 'read-later' ? 'saved' : 'read-later';
            
            articleEl.innerHTML = `
                <div class="article-header">
                    <h3 class="article-title">
                        <a href="${article.url}" target="_blank" rel="noopener noreferrer">
                            ${this.escapeHtml(article.title)}
                        </a>
                    </h3>
                    <div class="article-actions">
                        <button class="article-action-btn open" data-url="${article.url}">
                            Open
                        </button>
                        <button class="article-action-btn save" data-id="${article._id}" data-target-type="${saveButtonAction}" data-story-id="${article.storyId}" data-title="${this.escapeHtml(article.title)}" data-url="${article.url}" data-score="${article.score || 0}" data-author="${this.escapeHtml(article.author || 'unknown')}" data-comments="${article.comments || 0}">
                            ${saveButtonText}
                        </button>
                        <button class="article-action-btn delete" data-id="${article._id}">
                            Remove
                        </button>
                    </div>
                </div>
                <div class="article-meta">
                    ${article.score ? `
                        <div class="article-meta-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                            </svg>
                            <span>${article.score} points</span>
                        </div>
                    ` : ''}
                    ${article.author ? `
                        <div class="article-meta-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                            <span>${this.escapeHtml(article.author)}</span>
                        </div>
                    ` : ''}
                    ${article.comments ? `
                        <div class="article-meta-item">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                            </svg>
                            <span>${article.comments} comments</span>
                        </div>
                    ` : ''}
                </div>
                <div class="article-saved-time">Saved ${timeAgo}</div>
            `;
            
            listEl.appendChild(articleEl);
        });
        
        // Add event listeners for article actions
        this.attachArticleActionListeners();
    }

    // Attach event listeners for article actions
    attachArticleActionListeners() {
        const listEl = document.getElementById('articlesList');
        
        listEl.addEventListener('click', async (e) => {
            if (e.target.closest('.article-action-btn.open')) {
                const url = e.target.closest('.article-action-btn.open').getAttribute('data-url');
                if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            } else if (e.target.closest('.article-action-btn.save')) {
                const btn = e.target.closest('.article-action-btn.save');
                const articleId = btn.getAttribute('data-id');
                const targetType = btn.getAttribute('data-target-type');
                const storyId = btn.getAttribute('data-story-id');
                const title = btn.getAttribute('data-title');
                const url = btn.getAttribute('data-url');
                const score = parseInt(btn.getAttribute('data-score')) || 0;
                const author = btn.getAttribute('data-author');
                const comments = parseInt(btn.getAttribute('data-comments')) || 0;
                
                await this.toggleArticleType(articleId, targetType, {
                    storyId,
                    title,
                    url,
                    score,
                    author,
                    comments
                });
            } else if (e.target.closest('.article-action-btn.delete')) {
                const btn = e.target.closest('.article-action-btn.delete');
                const articleId = btn.getAttribute('data-id');
                await this.deleteArticle(articleId);
            }
        });
    }

    // Delete article
    async deleteArticle(articleId) {
        try {
            const result = await chrome.storage.local.get(['userToken']);
            if (!result.userToken) {
                this.showNotification('Please login first', 'error');
                return;
            }
            
            const response = await fetch(`http://localhost:3000/api/articles/${articleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${result.userToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete article');
            }
            
            // Remove article from DOM
            const articleEl = document.querySelector(`[data-article-id="${articleId}"]`);
            if (articleEl) {
                articleEl.style.opacity = '0';
                articleEl.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    articleEl.remove();
                    
                    // Check if list is empty
                    const listEl = document.getElementById('articlesList');
                    if (listEl.children.length === 0) {
                        const emptyEl = document.getElementById('articlesEmpty');
                        const emptyMessage = document.getElementById('emptyMessage');
                        const activeTab = document.querySelector('.articles-tab.active');
                        const type = activeTab?.getAttribute('data-type') || 'read-later';
                        
                        listEl.style.display = 'none';
                        emptyEl.style.display = 'flex';
                        emptyMessage.textContent = type === 'saved' 
                            ? 'You haven\'t saved any articles yet.' 
                            : 'You haven\'t added any articles to read later.';
                    }
                }, 300);
            }
            
            this.showNotification('Article removed successfully', 'success');
            
            // Update user profile counts
            await this.updateUserProfile();
            
        } catch (error) {
            console.error('Failed to delete article:', error);
            this.showNotification('Failed to remove article', 'error');
        }
    }

    // Toggle article type (between saved and read-later)
    async toggleArticleType(articleId, targetType, articleData) {
        try {
            const result = await chrome.storage.local.get(['userToken']);
            if (!result.userToken) {
                this.showNotification('Please login first', 'error');
                return;
            }
            
            // First, delete the old article
            const deleteResponse = await fetch(`http://localhost:3000/api/articles/${articleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${result.userToken}`
                }
            });
            
            if (!deleteResponse.ok) {
                throw new Error('Failed to update article');
            }
            
            // Then, save it with the new type
            const saveResponse = await fetch('http://localhost:3000/api/articles/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.userToken}`
                },
                body: JSON.stringify({
                    storyId: articleData.storyId,
                    title: articleData.title,
                    url: articleData.url,
                    type: targetType,
                    score: articleData.score,
                    author: articleData.author,
                    comments: articleData.comments
                }),
                mode: 'cors'
            });
            
            const saveData = await saveResponse.json();
            
            if (saveData.success) {
                // Remove article from DOM with animation
                const articleEl = document.querySelector(`[data-article-id="${articleId}"]`);
                if (articleEl) {
                    articleEl.style.opacity = '0';
                    articleEl.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        articleEl.remove();
                        
                        // Check if list is empty
                        const listEl = document.getElementById('articlesList');
                        if (listEl.children.length === 0) {
                            const emptyEl = document.getElementById('articlesEmpty');
                            const emptyMessage = document.getElementById('emptyMessage');
                            const activeTab = document.querySelector('.articles-tab.active');
                            const type = activeTab?.getAttribute('data-type') || 'read-later';
                            
                            listEl.style.display = 'none';
                            emptyEl.style.display = 'flex';
                            emptyMessage.textContent = type === 'saved' 
                                ? 'You haven\'t saved any articles yet.' 
                                : 'You haven\'t added any articles to read later.';
                        }
                    }, 300);
                }
                
                const actionText = targetType === 'saved' ? 'saved' : 'moved to read later';
                this.showNotification(`Article ${actionText} successfully`, 'success');
                
                // Update user profile counts
                await this.updateUserProfile();
            } else {
                throw new Error('Failed to save article');
            }
            
        } catch (error) {
            console.error('Failed to toggle article type:', error);
            this.showNotification('Failed to update article', 'error');
        }
    }

    // Get time ago string
    getTimeAgo(dateString) {
        const now = new Date();
        const past = new Date(dateString);
        const diffInMinutes = Math.floor((now - past) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return `${diffInDays}d ago`;
        
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return `${diffInMonths}mo ago`;
        
        const diffInYears = Math.floor(diffInMonths / 12);
        return `${diffInYears}y ago`;
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Prevent duplicate notifications
        const existingNotifications = document.querySelectorAll('.notification-toast');
        existingNotifications.forEach(notification => {
            if (notification.textContent === message) {
                return; // Don't show duplicate
            }
        });

        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'notification-toast';
        const leftPanel = document.querySelector('.left-column');
        const colors = {
            success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        };

        notificationDiv.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            max-width: 280px;
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInFromRight 0.4s ease-out;
        `;
        notificationDiv.textContent = message;
        
        // Append to left panel instead of body
        if (leftPanel) {
            leftPanel.appendChild(notificationDiv);
        } else {
            document.body.appendChild(notificationDiv);
        }
        
        setTimeout(() => {
            notificationDiv.style.animation = 'slideOutToRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notificationDiv.parentNode) {
                    notificationDiv.remove();
                }
            }, 300);
        }, 3000);
    }

    // ==================== CRAZY SEARCH BAR METHODS ====================

    // Setup crazy search bar with all animations and interactions
    setupCrazySearchBar() {
        const searchInput = document.getElementById('searchInput');
        const searchIcon = document.getElementById('searchIconAnimated');
        const typingIndicator = document.getElementById('typingIndicator');
        const searchSuggestions = document.getElementById('searchSuggestions');
        const searchParticles = document.getElementById('searchParticles');
        const searchEnergyRipples = document.getElementById('searchEnergyRipples');
        const voiceBtn = document.getElementById('voiceBtn');
        const cameraBtn = document.getElementById('cameraBtn');
        const aiBtn = document.getElementById('aiBtn');

        if (!searchInput) return;

        let isTyping = false;
        let typingTimeout = null;
        let isFocused = false;

        // Search suggestions
        const suggestions = [
            "AI breakthrough neural networks",
            "Quantum computing latest news", 
            "Blockchain technology updates",
            "Space exploration missions",
            "Cybersecurity threats 2024"
        ];

        // Create floating particles
        this.createSearchParticles();

        // Input event handlers
        searchInput.addEventListener('input', (e) => {
            const value = e.target.value;
            isTyping = true;
            
            // Toggle Enter button based on input
            this.toggleEnterButton(value);
            
            // Show typing indicator
            if (typingIndicator) {
                typingIndicator.classList.add('active');
            }

            // Rotate search icon
            if (searchIcon) {
                searchIcon.classList.add('rotating');
                setTimeout(() => {
                    searchIcon.classList.remove('rotating');
                }, 500);
            }

            // Clear previous timeout
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }

            // Hide typing indicator after delay
            typingTimeout = setTimeout(() => {
                isTyping = false;
                if (typingIndicator) {
                    typingIndicator.classList.remove('active');
                }
            }, 1000);

            // Show suggestions if there's text and focused
            if (value.length > 0 && isFocused) {
                this.showSearchSuggestions(value, suggestions);
            } else {
                this.hideSearchSuggestions();
            }
        });

        // Focus event handlers
        searchInput.addEventListener('focus', () => {
            isFocused = true;
            this.createEnergyRipples();
            
            if (searchInput.value.length > 0) {
                this.showSearchSuggestions(searchInput.value, suggestions);
            }
        });

        searchInput.addEventListener('blur', () => {
            isFocused = false;
            // Delay hiding suggestions to allow clicking
            setTimeout(() => {
                this.hideSearchSuggestions();
            }, 200);
        });

        // Action button handlers
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.handleVoiceSearch();
            });
        }

        if (cameraBtn) {
            cameraBtn.addEventListener('click', () => {
                this.handleCameraSearch();
            });
        }

        if (aiBtn) {
            aiBtn.addEventListener('click', () => {
                this.handleAISearch();
            });
        }

        // Create and setup Enter button
        this.createEnterButton();
        
        // Search on Enter key (but only if Enter button is visible)
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleEnterSearch();
            }
        });
    }

    // Create Enter button
    createEnterButton() {
        const searchActionButtons = document.querySelector('.search-action-buttons');
        if (!searchActionButtons) return;

        // Check if Enter button already exists
        if (document.getElementById('enterBtn')) return;

        const enterBtn = document.createElement('button');
        enterBtn.id = 'enterBtn';
        enterBtn.className = 'search-action-btn enter-btn';
        enterBtn.title = 'Search';
        enterBtn.style.display = 'none'; // Hidden by default
        
        enterBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <div class="btn-glow"></div>
        `;

        // Add click handler
        enterBtn.addEventListener('click', () => {
            this.handleEnterSearch();
        });

        // Insert Enter button as the last button
        searchActionButtons.appendChild(enterBtn);
    }

    // Toggle Enter button visibility
    toggleEnterButton(inputValue) {
        const enterBtn = document.getElementById('enterBtn');
        if (!enterBtn) return;

        if (inputValue && inputValue.trim().length > 0) {
            enterBtn.style.display = 'flex';
            enterBtn.style.animation = 'enterButtonSlideIn 0.3s ease-out';
        } else {
            enterBtn.style.animation = 'enterButtonSlideOut 0.3s ease-in';
            setTimeout(() => {
                enterBtn.style.display = 'none';
            }, 300);
        }
    }

    // Handle Enter search
    handleEnterSearch() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput || !searchInput.value.trim()) return;

        const query = searchInput.value.trim();
        this.performSearch(query);
        
        // Clear input after search
        setTimeout(() => {
            searchInput.value = '';
            this.toggleEnterButton('');
        }, 1000);
    }

    // Create floating particles around search bar
    createSearchParticles() {
        const particlesContainer = document.getElementById('searchParticles');
        if (!particlesContainer) return;

        // Clear existing particles
        particlesContainer.innerHTML = '';

        // Create 8 particles
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.className = 'search-particle';
            particle.style.left = `${20 + i * 10}%`;
            particle.style.top = `${30 + (i % 3) * 20}%`;
            particle.style.animationDelay = `${i * 0.3}s`;
            particlesContainer.appendChild(particle);
        }
    }

    // Create energy ripples when focused
    createEnergyRipples() {
        const ripplesContainer = document.getElementById('searchEnergyRipples');
        if (!ripplesContainer) return;

        // Clear existing ripples
        ripplesContainer.innerHTML = '';

        // Create 3 ripples
        for (let i = 0; i < 3; i++) {
            const ripple = document.createElement('div');
            ripple.className = 'energy-ripple';
            ripple.style.animationDelay = `${i * 0.7}s`;
            ripplesContainer.appendChild(ripple);
        }
    }

    // Show search suggestions
    showSearchSuggestions(query, suggestions) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer) return;

        const filteredSuggestions = suggestions.filter(s => 
            s.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 3);

        if (filteredSuggestions.length === 0) {
            this.hideSearchSuggestions();
            return;
        }

        suggestionsContainer.innerHTML = '';
        
        filteredSuggestions.forEach((suggestion, index) => {
            const suggestionElement = document.createElement('div');
            suggestionElement.className = 'search-suggestion';
            suggestionElement.style.animationDelay = `${index * 0.1}s`;
            
            suggestionElement.innerHTML = `
                <svg class="search-suggestion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1 .34-4.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path>
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0-.34-4.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path>
                </svg>
                <span>${suggestion}</span>
            `;

            suggestionElement.addEventListener('click', () => {
                document.getElementById('searchInput').value = suggestion;
                this.performSearch(suggestion);
                this.hideSearchSuggestions();
            });

            suggestionsContainer.appendChild(suggestionElement);
        });

        suggestionsContainer.classList.add('active');
    }

    // Hide search suggestions
    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('active');
        }
    }

    // Handle voice search
    handleVoiceSearch() {
        const voiceBtn = document.getElementById('voiceBtn');
        const searchInput = document.getElementById('searchInput');
        
        // Check if browser supports speech recognition
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showNotification('Voice search not supported in this browser', 'error');
            return;
        }

        // Create speech recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        // Add visual feedback - listening state
        if (voiceBtn) {
            voiceBtn.style.background = 'rgba(239, 68, 68, 0.2)';
            voiceBtn.style.animation = 'voicePulse 1s ease-in-out infinite';
        }

        // Show listening notification
        this.showNotification('🎤 Listening... Speak now!', 'info');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (searchInput) {
                searchInput.value = transcript;
                this.toggleEnterButton(transcript); // Show Enter button
            }
            this.showNotification(`🎤 Heard: "${transcript}" - Click Enter to search!`, 'success');
        };

        recognition.onerror = (event) => {
            this.showNotification('Voice search failed. Please try again.', 'error');
            console.error('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
            // Reset button state
            if (voiceBtn) {
                voiceBtn.style.background = 'transparent';
                voiceBtn.style.animation = 'none';
            }
        };

        // Start listening
        try {
            recognition.start();
        } catch (error) {
            this.showNotification('Could not start voice search', 'error');
            if (voiceBtn) {
                voiceBtn.style.background = 'transparent';
                voiceBtn.style.animation = 'none';
            }
        }
    }

    // Handle camera search
    handleCameraSearch() {
        // Commented out for now - image upload functionality disabled
        /*
        const cameraBtn = document.getElementById('cameraBtn');
        
        // Add visual feedback - active state
        if (cameraBtn) {
            cameraBtn.style.background = 'rgba(34, 197, 94, 0.2)';
            cameraBtn.style.animation = 'cameraPulse 1s ease-in-out infinite';
        }

        // Create file input for image upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                this.processImageSearch(file);
            }
            
            // Reset button state
            if (cameraBtn) {
                cameraBtn.style.background = 'transparent';
                cameraBtn.style.animation = 'none';
            }
        };

        // Trigger file selection
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);

        // Show instruction notification
        this.showNotification('📷 Select an image to search', 'info');
        */
        
        // Temporary message
        this.showNotification('📷 Image search coming soon!', 'info');
    }

    // Process image search - Commented out for now
    /*
    async processImageSearch(file) {
        try {
            this.showNotification('🔍 Analyzing image...', 'info');
            
            // Create a preview of the image
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                
                // For now, simulate image analysis and extract text/context
                // In a real implementation, you could use:
                // - Google Vision API for OCR
                // - AI services for image recognition
                // - Local OCR libraries
                
                setTimeout(() => {
                    // Simulate extracted text or recognized objects
                    const simulatedResults = [
                        "artificial intelligence",
                        "machine learning", 
                        "neural networks",
                        "computer vision",
                        "deep learning",
                        "programming",
                        "software development",
                        "tech innovation"
                    ];
                    
                    const randomResult = simulatedResults[Math.floor(Math.random() * simulatedResults.length)];
                    const searchInput = document.getElementById('searchInput');
                    
                    if (searchInput) {
                        searchInput.value = randomResult;
                        this.toggleEnterButton(randomResult); // Show Enter button
                    }
                    
                    this.showNotification(`📷 Image analyzed! Found: "${randomResult}" - Click Enter to search!`, 'success');
                }, 2000);
            };
            
            reader.readAsDataURL(file);
            
        } catch (error) {
            this.showNotification('Failed to process image', 'error');
            console.error('Image processing error:', error);
        }
    }
    */

    // Handle AI search
    handleAISearch() {
        // Add visual feedback
        const aiBtn = document.getElementById('aiBtn');
        if (aiBtn) {
            aiBtn.style.background = 'rgba(59, 130, 246, 0.3)';
            setTimeout(() => {
                aiBtn.style.background = 'transparent';
            }, 1000);
        }

        // Simulate AI search
        setTimeout(() => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = "AI-powered tech news summary";
                this.performSearch(searchInput.value);
            }
        }, 1000);
    }

    // Perform search
    performSearch(query) {
        if (!query.trim()) return;

        // Add search animation
        const searchContainer = document.getElementById('crazySearchContainer');
        if (searchContainer) {
            searchContainer.style.transform = 'scale(0.98)';
            setTimeout(() => {
                searchContainer.style.transform = 'scale(1)';
            }, 150);
        }

        console.log('Performing search for:', query);
        
        // Show searching notification
        this.showSearchNotification(`🔍 Searching for: ${query}`, 'info');
        
        // Construct search URL based on query type
        let searchUrl;
        
        // Check if it's a URL
        if (query.startsWith('http://') || query.startsWith('https://') || query.includes('.com') || query.includes('.org')) {
            searchUrl = query.startsWith('http') ? query : `https://${query}`;
        }
        // Check for specific sites
        else if (query.toLowerCase().includes('github')) {
            searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}`;
        }
        else if (query.toLowerCase().includes('stackoverflow') || query.toLowerCase().includes('stack overflow')) {
            searchUrl = `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`;
        }
        else if (query.toLowerCase().includes('youtube')) {
            searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        }
        else if (query.toLowerCase().includes('reddit')) {
            searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
        }
        // Default to Google search
        else {
            searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
        
        // Open search in new tab
        setTimeout(() => {
            window.open(searchUrl, '_blank', 'noopener,noreferrer');
            this.showSearchNotification(`🚀 Opened search results for: ${query}`, 'success');
        }, 500);
    }

    // Show search notification
    showSearchNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        const leftPanel = document.querySelector('.left-column');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            border: 1px solid rgba(59, 130, 246, 0.3);
            backdrop-filter: blur(12px);
            z-index: 10000;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 600;
            max-width: 280px;
            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
        `;

        // Append to left panel instead of body
        if (leftPanel) {
            leftPanel.appendChild(notification);
        } else {
            document.body.appendChild(notification);
        }

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // ==================== CRAZY SHORTCUTS METHODS ====================

    // Setup crazy shortcuts with all animations and interactions
    setupCrazyShortcuts() {
        const shortcutsGrid = document.getElementById('shortcutsGrid');
        if (!shortcutsGrid) return;

        // Create background elements
        this.createShortcutsBackgroundElements();

        // Setup shortcut cards
        const shortcutCards = shortcutsGrid.querySelectorAll('.crazy-shortcut-card');
        shortcutCards.forEach((card, index) => {
            this.setupShortcutCard(card, index);
        });
    }

    // Setup individual shortcut card
    setupShortcutCard(card, index) {
        const particlesContainer = card.querySelector('.shortcut-particles');
        const button = card.querySelector('.shortcut-button');
        const iconContainer = card.querySelector('.shortcut-icon-container');
        const url = card.getAttribute('data-url');

        // Create floating particles for this card
        this.createShortcutParticles(particlesContainer);

        // Add staggered animation delay
        card.style.animationDelay = `${index * 0.1}s`;

        // Click handler
        card.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleShortcutClick(card, url);
        });

        // Hover effects
        card.addEventListener('mouseenter', () => {
            this.handleShortcutHover(card, true);
        });

        card.addEventListener('mouseleave', () => {
            this.handleShortcutHover(card, false);
        });

        // Add click animation
        card.addEventListener('mousedown', () => {
            this.handleShortcutPress(card, true);
        });

        card.addEventListener('mouseup', () => {
            this.handleShortcutPress(card, false);
        });
    }

    // Create floating particles for shortcut
    createShortcutParticles(container) {
        if (!container) return;

        // Clear existing particles
        container.innerHTML = '';

        // Create 6 particles
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'shortcut-particle';
            particle.style.left = `${20 + i * 15}%`;
            particle.style.top = `${20 + (i % 2) * 40}%`;
            particle.style.animationDelay = `${i * 0.1}s`;
            container.appendChild(particle);
        }
    }

    // Create background elements
    createShortcutsBackgroundElements() {
        const bgContainer = document.querySelector('.shortcuts-bg-elements');
        if (!bgContainer) return;

        // Clear existing elements
        bgContainer.innerHTML = '';

        // Create 4 background circles
        for (let i = 0; i < 4; i++) {
            const circle = document.createElement('div');
            circle.className = 'shortcut-bg-circle';
            circle.style.width = `${60 + i * 10}px`;
            circle.style.height = `${60 + i * 10}px`;
            circle.style.left = `${20 + i * 25}%`;
            circle.style.top = `${15 + i * 8}%`;
            circle.style.animationDelay = `${i * 0.5}s`;
            bgContainer.appendChild(circle);
        }
    }

    // Handle shortcut click
    handleShortcutClick(card, url) {
        // Add click animation
        const button = card.querySelector('.shortcut-button');
        if (button) {
            button.style.transform = 'scale(0.9)';
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
        }

        // Create ripple effect
        this.createShortcutRipple(card);

        // Handle different types of shortcuts
        if (card.classList.contains('add-shortcut')) {
            this.handleAddShortcut();
        } else if (url) {
            this.openShortcutUrl(url);
        }
    }

    // Handle shortcut hover
    handleShortcutHover(card, isHovering) {
        const particles = card.querySelector('.shortcut-particles');
        const glowRing = card.querySelector('.shortcut-glow-ring');
        const iconContainer = card.querySelector('.shortcut-icon-container');

        if (isHovering) {
            // Show particles
            if (particles) {
                particles.style.opacity = '1';
            }

            // Show glow ring
            if (glowRing) {
                glowRing.style.opacity = '1';
            }

            // Rotate icon
            if (iconContainer) {
                iconContainer.style.transform = 'rotate(360deg) scale(1.2)';
            }
        } else {
            // Hide particles
            if (particles) {
                particles.style.opacity = '0';
            }

            // Hide glow ring
            if (glowRing) {
                glowRing.style.opacity = '0';
            }

            // Reset icon
            if (iconContainer) {
                iconContainer.style.transform = '';
            }
        }
    }

    // Handle shortcut press
    handleShortcutPress(card, isPressed) {
        const button = card.querySelector('.shortcut-button');
        if (button) {
            if (isPressed) {
                button.style.transform = 'scale(0.95)';
            } else {
                button.style.transform = '';
            }
        }
    }

    // Create ripple effect
    createShortcutRipple(card) {
        const ripple = card.querySelector('.shortcut-ripple');
        if (ripple) {
            ripple.style.opacity = '1';
            ripple.style.transform = 'scale(2)';
            
            setTimeout(() => {
                ripple.style.opacity = '0';
                ripple.style.transform = 'scale(0)';
            }, 400);
        }
    }

    // Handle add shortcut
    handleAddShortcut() {
        // Show notification
        this.showSearchNotification('Add Shortcut feature coming soon!', 'info');
        
        // In real implementation, show modal to add custom shortcuts
        console.log('Add shortcut clicked');
    }

    // Open shortcut URL
    openShortcutUrl(url) {
        if (url) {
            // Add visual feedback
            this.showSearchNotification(`Opening ${url}`, 'success');
            
            // Open in new tab
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    // ==================== CRAZY LEFT PANEL BACKGROUND METHODS ====================

    // Setup crazy left panel background with canvas animations and neural network
    setupCrazyLeftPanelBackground() {
        // Initialize canvas animation
        this.initCanvasAnimation();
        
        // Create morphing shapes
        this.createMorphingShapes();
        
        // Create floating tech elements
        this.createFloatingTechElements();
        
        // Create SVG patterns
        this.createSVGPatterns();
        
        // Create scan lines
        this.createScanLines();
        
        // Setup mouse interaction
        this.setupMouseInteraction();
    }

    // Setup crazy data visualization with real-time charts
    setupCrazyDataVisualization() {
        this.initDataFlowCanvas();
        this.createMetricsCards();
        this.startDataUpdates();
    }

    // Initialize canvas animation with particles and neural network
    initCanvasAnimation() {
        const canvas = document.getElementById('bgCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Animation state
        let particles = [];
        let neuralNodes = [];
        let mousePos = { x: 0, y: 0 };
        let time = 0;
        let animationId;

        // Initialize particles
        const initParticles = () => {
            particles = [];
            for (let i = 0; i < 150; i++) {
                particles.push({
                    id: i,
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    size: Math.max(0.5, Math.random() * 3 + 1),
                    color: ['#3b82f6', '#60a5fa', '#1e40af', '#2563eb'][Math.floor(Math.random() * 4)],
                    opacity: Math.random() * 0.8 + 0.2,
                    type: ['node', 'data', 'wave'][Math.floor(Math.random() * 3)]
                });
            }
        };

        // Initialize neural network nodes
        const initNeuralNodes = () => {
            neuralNodes = [];
            for (let i = 0; i < 25; i++) {
                const connections = [];
                for (let j = 0; j < Math.random() * 4 + 1; j++) {
                    const connectedNode = Math.floor(Math.random() * 25);
                    if (connectedNode !== i && !connections.includes(connectedNode)) {
                        connections.push(connectedNode);
                    }
                }
                
                neuralNodes.push({
                    id: i,
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    connections,
                    pulse: Math.random() * Math.PI * 2,
                    energy: Math.random()
                });
            }
        };

        // Animation loop
        const animate = () => {
            time += 0.016; // ~60fps
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate energy level based on time
            const currentEnergyLevel = Math.sin(time * 0.5) * 0.5 + 0.5;
            
            // Draw neural network
            neuralNodes.forEach((node, index) => {
                // Update node pulse
                node.pulse += 0.02;
                node.energy = Math.max(0, Math.sin(node.pulse) * 0.5 + 0.5);
                
                // Draw connections
                node.connections.forEach(connectedId => {
                    if (connectedId < neuralNodes.length) {
                        const connectedNode = neuralNodes[connectedId];
                        const distance = Math.sqrt((node.x - connectedNode.x) ** 2 + (node.y - connectedNode.y) ** 2);
                        
                        if (distance < 200) {
                            ctx.beginPath();
                            ctx.moveTo(node.x, node.y);
                            ctx.lineTo(connectedNode.x, connectedNode.y);
                            
                            const alpha = (1 - distance / 200) * (node.energy + connectedNode.energy) * 0.3;
                            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
                            ctx.lineWidth = Math.max(0.5, 1 + node.energy * 2);
                            ctx.stroke();
                            
                            // Draw energy pulse along connection
                            const pulsePos = (Math.sin(time * 2 + index) + 1) / 2;
                            const pulseX = node.x + (connectedNode.x - node.x) * pulsePos;
                            const pulseY = node.y + (connectedNode.y - node.y) * pulsePos;
                            
                            ctx.beginPath();
                            ctx.arc(pulseX, pulseY, Math.max(0.5, 2), 0, Math.PI * 2);
                            ctx.fillStyle = `rgba(96, 165, 250, ${alpha * 2})`;
                            ctx.fill();
                        }
                    }
                });
                
                // Draw node
                ctx.beginPath();
                ctx.arc(node.x, node.y, Math.max(1, 3 + node.energy * 5), 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 8);
                gradient.addColorStop(0, `rgba(59, 130, 246, ${node.energy})`);
                gradient.addColorStop(1, `rgba(30, 64, 175, ${node.energy * 0.3})`);
                ctx.fillStyle = gradient;
                ctx.fill();
            });

            // Draw and update particles
            particles.forEach(particle => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Bounce off edges
                if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1;
                if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1;
                
                // Add mouse attraction
                const mouseDistance = Math.sqrt((mousePos.x - particle.x) ** 2 + (mousePos.y - particle.y) ** 2);
                if (mouseDistance < 100) {
                    const attraction = (100 - mouseDistance) / 100 * 0.01;
                    particle.vx += (mousePos.x - particle.x) * attraction * 0.1;
                    particle.vy += (mousePos.y - particle.y) * attraction * 0.1;
                }
                
                // Draw particle based on type
                ctx.save();
                ctx.globalAlpha = particle.opacity * (0.7 + currentEnergyLevel * 0.3);
                
                if (particle.type === 'node') {
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, Math.max(0.5, particle.size), 0, Math.PI * 2);
                    ctx.fillStyle = particle.color;
                    ctx.fill();
                } else if (particle.type === 'data') {
                    ctx.fillStyle = particle.color;
                    const size = Math.max(0.5, particle.size);
                    ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
                } else if (particle.type === 'wave') {
                    ctx.beginPath();
                    const waveSize = Math.max(0.5, particle.size + Math.sin(time * 3 + particle.id) * 2);
                    ctx.arc(particle.x, particle.y, waveSize, 0, Math.PI * 2);
                    ctx.strokeStyle = particle.color;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                
                ctx.restore();
            });
            
            animationId = requestAnimationFrame(animate);
        };

        // Mouse tracking
        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mousePos.x = e.clientX - rect.left;
            mousePos.y = e.clientY - rect.top;
        };

        canvas.addEventListener('mousemove', handleMouseMove);

        // Initialize and start animation
        initParticles();
        initNeuralNodes();
        animate();

        // Store cleanup function
        this.cleanupCanvas = () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            canvas.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', resizeCanvas);
        };
    }

    // Create morphing shapes
    createMorphingShapes() {
        const container = document.getElementById('morphingShapes');
        if (!container) return;

        // Clear existing shapes
        container.innerHTML = '';

        // Create 8 morphing shapes
        for (let i = 0; i < 8; i++) {
            const shape = document.createElement('div');
            shape.className = 'morphing-shape';
            shape.style.left = `${20 + i * 12}%`;
            shape.style.top = `${15 + i * 8}%`;
            shape.style.width = `${60 + i * 10}px`;
            shape.style.height = `${60 + i * 10}px`;
            shape.style.animationDelay = `${i * 0.5}s`;
            container.appendChild(shape);
        }
    }

    // Create floating tech elements
    createFloatingTechElements() {
        const container = document.getElementById('floatingTechElements');
        if (!container) return;

        // Clear existing elements
        container.innerHTML = '';

        // Create holographic data streams
        for (let i = 0; i < 12; i++) {
            const stream = document.createElement('div');
            stream.className = 'holographic-data-stream';
            stream.style.left = `${i * 8}%`;
            stream.style.top = `${Math.random() * 100}%`;
            stream.style.animationDelay = `${i * 0.3}s`;
            container.appendChild(stream);
        }

        // Create rotating code symbols
        const symbols = ['{ }', '< />', '[ ]', '( )', '&&', '||', '=>', '!='];
        symbols.forEach((symbol, i) => {
            const symbolElement = document.createElement('div');
            symbolElement.className = 'rotating-code-symbol';
            symbolElement.textContent = symbol;
            symbolElement.style.left = `${10 + i * 10}%`;
            symbolElement.style.top = `${20 + (i % 3) * 25}%`;
            symbolElement.style.animationDelay = `${i * 0.5}s`;
            container.appendChild(symbolElement);
        });

        // Create pulsing circuit nodes
        for (let i = 0; i < 15; i++) {
            const node = document.createElement('div');
            node.className = 'pulsing-circuit-node';
            node.style.left = `${Math.random() * 100}%`;
            node.style.top = `${Math.random() * 100}%`;
            node.style.animationDelay = `${i * 0.2}s`;
            container.appendChild(node);
        }
    }

    // Create SVG patterns
    createSVGPatterns() {
        const container = document.getElementById('svgPatterns');
        if (!container) return;

        // Clear existing patterns
        container.innerHTML = '';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-full h-full');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // Define patterns and gradients
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Hex pattern
        const hexPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        hexPattern.setAttribute('id', 'hexPattern');
        hexPattern.setAttribute('width', '60');
        hexPattern.setAttribute('height', '52');
        hexPattern.setAttribute('patternUnits', 'userSpaceOnUse');
        
        const hexPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        hexPolygon.setAttribute('points', '30,2 52,15 52,37 30,50 8,37 8,15');
        hexPolygon.setAttribute('fill', 'none');
        hexPolygon.setAttribute('stroke', 'url(#hexGradient)');
        hexPolygon.setAttribute('stroke-width', '1');
        hexPattern.appendChild(hexPolygon);
        
        // Hex gradient
        const hexGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        hexGradient.setAttribute('id', 'hexGradient');
        hexGradient.setAttribute('x1', '0%');
        hexGradient.setAttribute('y1', '0%');
        hexGradient.setAttribute('x2', '100%');
        hexGradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#3b82f6');
        stop1.setAttribute('stop-opacity', '0.4');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '50%');
        stop2.setAttribute('stop-color', '#60a5fa');
        stop2.setAttribute('stop-opacity', '0.2');
        
        const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop3.setAttribute('offset', '100%');
        stop3.setAttribute('stop-color', '#1e40af');
        stop3.setAttribute('stop-opacity', '0.1');
        
        hexGradient.appendChild(stop1);
        hexGradient.appendChild(stop2);
        hexGradient.appendChild(stop3);
        
        // Glow filter
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'glow');
        
        const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
        feGaussianBlur.setAttribute('stdDeviation', '3');
        feGaussianBlur.setAttribute('result', 'coloredBlur');
        
        const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
        const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode1.setAttribute('in', 'coloredBlur');
        const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
        feMergeNode2.setAttribute('in', 'SourceGraphic');
        
        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);
        filter.appendChild(feGaussianBlur);
        filter.appendChild(feMerge);
        
        defs.appendChild(hexPattern);
        defs.appendChild(hexGradient);
        defs.appendChild(filter);
        svg.appendChild(defs);

        // Background pattern
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', 'url(#hexPattern)');
        rect.setAttribute('filter', 'url(#glow)');
        svg.appendChild(rect);

        // Dynamic energy waves
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('opacity', '0.4');
        
        const wave1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        wave1.setAttribute('d', 'M0,300 Q200,250 400,300 T800,300');
        wave1.setAttribute('fill', 'none');
        wave1.setAttribute('stroke', 'url(#hexGradient)');
        wave1.setAttribute('stroke-width', '2');
        wave1.setAttribute('class', 'energy-wave');
        
        const wave2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        wave2.setAttribute('d', 'M0,400 Q150,350 300,400 T600,400');
        wave2.setAttribute('fill', 'none');
        wave2.setAttribute('stroke', 'url(#hexGradient)');
        wave2.setAttribute('stroke-width', '2');
        wave2.setAttribute('class', 'energy-wave');
        wave2.style.animationDelay = '1s';
        
        g.appendChild(wave1);
        g.appendChild(wave2);
        svg.appendChild(g);

        container.appendChild(svg);
    }

    // Create scan lines
    createScanLines() {
        const container = document.getElementById('scanLines');
        if (!container) return;

        // Clear existing scan lines
        container.innerHTML = '';

        // Create 2 scan lines
        for (let i = 0; i < 2; i++) {
            const scanLine = document.createElement('div');
            scanLine.className = 'scan-line';
            if (i === 1) {
                scanLine.style.animationDelay = '1.5s';
                scanLine.style.animationDuration = '4s';
            }
            container.appendChild(scanLine);
        }
    }

    // Setup mouse interaction
    setupMouseInteraction() {
        const leftColumn = document.querySelector('.left-column');
        if (!leftColumn) return;

        leftColumn.addEventListener('mousemove', (e) => {
            // Update energy field based on mouse position
            const energyField = document.getElementById('energyField');
            if (energyField) {
                const rect = leftColumn.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                energyField.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)`;
            }
        });
    }

    // Initialize data flow canvas
    initDataFlowCanvas() {
        const canvas = document.getElementById('dataFlowCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Data flow animation
        let animationId;
        const dataPoints = [];
        const maxPoints = 50;

        // Initialize data points
        for (let i = 0; i < maxPoints; i++) {
            dataPoints.push({
                x: (i / maxPoints) * canvas.width,
                y: canvas.height / 2 + Math.sin(i * 0.1) * 20,
                vx: Math.random() * 2 - 1,
                vy: Math.random() * 2 - 1,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.5 + 0.3
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw data points
            dataPoints.forEach((point, index) => {
                // Update position
                point.x += point.vx;
                point.y += point.vy;

                // Bounce off edges
                if (point.x < 0 || point.x > canvas.width) point.vx *= -1;
                if (point.y < 0 || point.y > canvas.height) point.vy *= -1;

                // Draw point
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(96, 165, 250, ${point.opacity})`;
                ctx.fill();

                // Draw connections to nearby points
                for (let j = index + 1; j < dataPoints.length; j++) {
                    const other = dataPoints[j];
                    const distance = Math.sqrt(
                        Math.pow(point.x - other.x, 2) + Math.pow(point.y - other.y, 2)
                    );

                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.moveTo(point.x, point.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = `rgba(96, 165, 250, ${0.1 * (1 - distance / 100)})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            });

            animationId = requestAnimationFrame(animate);
        };

        animate();

        // Cleanup function
        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }

    // Create metrics cards
    createMetricsCards() {
        const metricsGrid = document.getElementById('metricsGrid');
        if (!metricsGrid) return;

        const metrics = [
            {
                id: 'users',
                title: 'Active Users',
                value: '2.4K',
                change: 12.5,
                icon: '👥',
                color: 'users',
                trend: this.generateTrendData(20, 100, 300)
            },
            {
                id: 'activity',
                title: 'Page Views',
                value: '15.2K',
                change: -3.2,
                icon: '📊',
                color: 'activity',
                trend: this.generateTrendData(20, 200, 500)
            },
            {
                id: 'views',
                title: 'Engagement',
                value: '89%',
                change: 8.1,
                icon: '💬',
                color: 'views',
                trend: this.generateTrendData(20, 50, 100)
            },
            {
                id: 'interactions',
                title: 'Interactions',
                value: '1.2K',
                change: 15.3,
                icon: '⚡',
                color: 'interactions',
                trend: this.generateTrendData(20, 80, 200)
            }
        ];

        metricsGrid.innerHTML = '';

        metrics.forEach((metric, index) => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.style.animationDelay = `${index * 0.1}s`;

            const changeClass = metric.change >= 0 ? 'positive' : 'negative';
            const changeIcon = metric.change >= 0 ? '↗' : '↘';

            card.innerHTML = `
                <div class="metric-card-bg">
                    <div class="metric-card-glow"></div>
                    <div class="metric-header">
                        <div class="metric-icon-container">
                            <div class="metric-icon ${metric.color}">
                                <span style="font-size: 16px;">${metric.icon}</span>
                            </div>
                            <span class="metric-title">${metric.title}</span>
                        </div>
                        <div class="metric-change ${changeClass}">
                            <span>${changeIcon}</span>
                            <span>${Math.abs(metric.change)}%</span>
                        </div>
                    </div>
                    <div class="metric-value">${metric.value}</div>
                    <div class="metric-chart">
                        ${this.createTrendChart(metric.trend, metric.color)}
                    </div>
                </div>
            `;

            metricsGrid.appendChild(card);
        });
    }

    // Generate trend data for charts
    generateTrendData(points, min, max) {
        const data = [];
        for (let i = 0; i < points; i++) {
            data.push({
                x: i,
                y: min + Math.random() * (max - min) + Math.sin(i * 0.3) * 20
            });
        }
        return data;
    }

    // Create trend chart SVG
    createTrendChart(data, color) {
        if (!data || data.length === 0) return '';

        const width = 200;
        const height = 48;
        const padding = 4;

        const minY = Math.min(...data.map(d => d.y));
        const maxY = Math.max(...data.map(d => d.y));
        const rangeY = maxY - minY || 1;

        const scaleX = (width - padding * 2) / (data.length - 1);
        const scaleY = (height - padding * 2) / rangeY;

        const points = data.map((d, i) => {
            const x = padding + i * scaleX;
            const y = padding + (maxY - d.y) * scaleY;
            return `${x},${y}`;
        }).join(' ');

        const pathData = `M ${points}`;
        const fillData = `M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`;

        const colors = {
            users: '#60a5fa',
            activity: '#10b981',
            views: '#a855f7',
            interactions: '#60a5fa'
        };

        return `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <defs>
                    <linearGradient id="gradient-${color}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${colors[color]};stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:${colors[color]};stop-opacity:0.1" />
                    </linearGradient>
                </defs>
                <path d="${fillData}" fill="url(#gradient-${color})" class="metric-chart-fill" />
                <path d="${pathData}" fill="none" stroke="${colors[color]}" stroke-width="2" class="metric-chart-path" />
            </svg>
        `;
    }

    // Start data updates
    startDataUpdates() {
        // Update metrics every 5 seconds
        setInterval(() => {
            this.updateMetrics();
        }, 5000);

        // Update activity indicator
        this.updateActivityIndicator();
    }

    // Update metrics with new data
    updateMetrics() {
        const metricValues = document.querySelectorAll('.metric-value');
        metricValues.forEach((element, index) => {
            const currentValue = element.textContent;
            const newValue = this.generateNewMetricValue(currentValue, index);
            
            // Animate value change
            element.style.transform = 'scale(1.1)';
            element.style.color = '#60a5fa';
            
            setTimeout(() => {
                element.textContent = newValue;
                element.style.transform = 'scale(1)';
                element.style.color = '#ffffff';
            }, 150);
        });
    }

    // Generate new metric value
    generateNewMetricValue(currentValue, index) {
        const metrics = [
            { base: 2400, unit: 'K', range: 200 },
            { base: 15200, unit: 'K', range: 1000 },
            { base: 89, unit: '%', range: 5 },
            { base: 1200, unit: 'K', range: 100 }
        ];

        const metric = metrics[index];
        const newValue = metric.base + (Math.random() - 0.5) * metric.range;
        
        if (metric.unit === '%') {
            return Math.round(newValue) + '%';
        } else {
            return (newValue / 1000).toFixed(1) + 'K';
        }
    }

    // Update activity indicator
    updateActivityIndicator() {
        const activityText = document.querySelector('.activity-text');
        if (!activityText) return;

        const messages = [
            'Processing live data streams',
            'Analyzing user interactions',
            'Updating real-time metrics',
            'Syncing with cloud services',
            'Optimizing performance',
            'Monitoring system health'
        ];

        let messageIndex = 0;
        setInterval(() => {
            activityText.textContent = messages[messageIndex];
            messageIndex = (messageIndex + 1) % messages.length;
        }, 3000);
    }

    // Setup crazy news feed with enhanced animations and interactions
    setupCrazyNewsFeed() {
        this.createNewsFeedParticles();
        this.setupNewsFeedStats();
        this.enhanceStoryInteractions();
        this.startNewsFeedAnimations();
    }

    // Create floating particles for news feed
    createNewsFeedParticles() {
        const particlesContainer = document.getElementById('newsFeedParticles');
        if (!particlesContainer) return;

        const particleCount = 15;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'news-feed-particle';
            
            // Random positioning
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            
            // Random animation delay
            particle.style.animationDelay = Math.random() * 8 + 's';
            
            // Random animation duration
            particle.style.animationDuration = (6 + Math.random() * 4) + 's';
            
            particlesContainer.appendChild(particle);
        }
    }

    // Setup news feed statistics
    setupNewsFeedStats() {
        this.updateNewsFeedStats();
        
        // Update stats every 10 seconds
        setInterval(() => {
            this.updateNewsFeedStats();
        }, 10000);
    }

    // Update news feed statistics
    updateNewsFeedStats() {
        const storyCount = document.getElementById('storyCount');
        const readerCount = document.getElementById('readerCount');
        const activityLevel = document.getElementById('activityLevel');
        
        if (storyCount) {
            const currentStories = document.querySelectorAll('.story').length;
            this.animateValue(storyCount, parseInt(storyCount.textContent) || 0, currentStories, 1000);
        }
        
        if (readerCount) {
            const readers = Math.floor(Math.random() * 500) + 1200;
            this.animateValue(readerCount, parseInt(readerCount.textContent) || 0, readers, 1000);
        }
        
        if (activityLevel) {
            const levels = ['Low', 'Medium', 'High', 'Very High'];
            const randomLevel = levels[Math.floor(Math.random() * levels.length)];
            activityLevel.textContent = randomLevel;
            
            // Add color based on activity level
            activityLevel.className = 'stat-value';
            switch (randomLevel) {
                case 'Low':
                    activityLevel.style.color = '#10b981';
                    break;
                case 'Medium':
                    activityLevel.style.color = '#f59e0b';
                    break;
                case 'High':
                    activityLevel.style.color = '#ef4444';
                    break;
                case 'Very High':
                    activityLevel.style.color = '#dc2626';
                    break;
            }
        }
    }

    // Animate value changes
    animateValue(element, start, end, duration) {
        const startTime = performance.now();
        const change = end - start;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (change * this.easeOutCubic(progress));
            element.textContent = Math.round(current);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // Easing function
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Enhance story interactions
    enhanceStoryInteractions() {
        // Add click effects
        document.addEventListener('click', (e) => {
            if (e.target.closest('.story')) {
                const story = e.target.closest('.story');
                this.addStoryClickEffect(story);
            }
        });
    }

    // Hover effects removed - only CSS hover effects remain

    // Add click effect to story
    addStoryClickEffect(story) {
        // Add click animation
        story.style.transform = 'scale(0.98)';
        story.style.transition = 'transform 0.1s ease';
        
        setTimeout(() => {
            story.style.transform = 'scale(1)';
        }, 100);
    }

    // Start news feed animations
    startNewsFeedAnimations() {
        // Animate story cards on load
        this.animateStoryCards();
        
        // Start periodic animations
        setInterval(() => {
            this.animateStoryCards();
        }, 30000);
    }

    // Animate story cards
    animateStoryCards() {
        const stories = document.querySelectorAll('.story');
        stories.forEach((story, index) => {
            // Reset animation
            story.style.animation = 'none';
            story.offsetHeight; // Trigger reflow
            
            // Add staggered animation
            story.style.animation = `storySlideIn 0.6s ease-out ${index * 0.1}s both`;
        });
    }

    // Setup floating AI assistant with chat interface
    setupFloatingAIAssistant() {
        this.setupAIAssistantToggle();
        this.setupAIAssistantChat();
        this.setupAIAssistantSuggestions();
    }

    // Setup AI assistant toggle button
    setupAIAssistantToggle() {
        const toggle = document.getElementById('aiAssistantToggle');
        const modal = document.getElementById('aiAssistantModal');
        
        if (!toggle || !modal) return;

        toggle.addEventListener('click', () => {
            modal.classList.toggle('active');
            
            if (modal.classList.contains('active')) {
                // Focus on input when opened
                const input = document.getElementById('aiAssistantInput');
                if (input) {
                    setTimeout(() => input.focus(), 300);
                }
            }
        });

        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.floating-ai-assistant') && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });
    }

    // Setup AI assistant chat functionality
    setupAIAssistantChat() {
        const input = document.getElementById('aiAssistantInput');
        const sendBtn = document.getElementById('aiAssistantSend');
        const chat = document.getElementById('aiAssistantChat');
        const closeBtn = document.getElementById('aiAssistantClose');
        const modal = document.getElementById('aiAssistantModal');

        if (!input || !sendBtn || !chat) return;

        // Send message on button click
        sendBtn.addEventListener('click', () => {
            this.sendAIMessage();
        });

        // Send message on Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendAIMessage();
            }
        });

        // Close modal
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
    }

    // Send AI message
    sendAIMessage() {
        const input = document.getElementById('aiAssistantInput');
        const chat = document.getElementById('aiAssistantChat');
        
        if (!input || !chat) return;

        const message = input.value.trim();
        if (!message) return;

        // Add user message
        this.addChatMessage(message, 'user');
        
        // Clear input
        input.value = '';

        // Simulate AI response
        setTimeout(() => {
            const response = this.generateAIResponse(message);
            this.addChatMessage(response, 'ai');
        }, 1000);
    }

    // Add chat message
    addChatMessage(message, type) {
        const chat = document.getElementById('aiAssistantChat');
        if (!chat) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-assistant-message ${type === 'user' ? 'user-message' : 'ai-message'}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        if (type === 'user') {
            avatar.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            `;
        } else {
            avatar.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
            `;
        }

        const content = document.createElement('div');
        content.className = 'message-content';
        content.innerHTML = `<p>${message}</p>`;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        chat.appendChild(messageDiv);

        // Scroll to bottom
        chat.scrollTop = chat.scrollHeight;
    }

    // Generate AI response
    generateAIResponse(userMessage) {
        const responses = {
            'ai': [
                "AI is currently one of the hottest topics in tech! Recent developments include large language models, computer vision breakthroughs, and AI-powered automation tools.",
                "The AI landscape is rapidly evolving with new models being released regularly. Key areas of focus include natural language processing, machine learning, and neural networks.",
                "AI technology is transforming industries from healthcare to finance. Recent news covers everything from ChatGPT alternatives to autonomous vehicles."
            ],
            'trending': [
                "Based on current tech news, trending topics include quantum computing, blockchain technology, space exploration, and cybersecurity innovations.",
                "The tech world is buzzing about new developments in renewable energy, electric vehicles, and smart city technologies.",
                "Recent trending stories cover everything from new programming languages to breakthrough scientific discoveries."
            ],
            'explain': [
                "I'd be happy to explain any tech story you're interested in! Could you provide more details about which specific article or topic you'd like me to break down?",
                "To give you the best explanation, please share the title or key points of the story you'd like me to analyze.",
                "I can help explain complex tech concepts in simple terms. What specific story or technology would you like me to clarify?"
            ],
            'similar': [
                "I can help you find similar articles! Let me search through the current tech news for related stories and topics.",
                "To find similar articles, I'll look for stories with related keywords, technologies, or themes. What specific topic are you interested in?",
                "I can suggest related articles based on the current tech news feed. What type of content are you looking for?"
            ],
            'default': [
                "That's an interesting question! I'm here to help you navigate the world of tech news and answer any questions you might have.",
                "I can help you understand tech trends, explain complex topics, or find information about specific technologies. What would you like to know?",
                "Great question! I'm designed to help you make sense of the fast-paced world of technology. How can I assist you today?"
            ]
        };

        const message = userMessage.toLowerCase();
        
        if (message.includes('ai') || message.includes('artificial intelligence')) {
            return this.getRandomResponse(responses.ai);
        } else if (message.includes('trending') || message.includes('popular')) {
            return this.getRandomResponse(responses.trending);
        } else if (message.includes('explain') || message.includes('what is') || message.includes('how does')) {
            return this.getRandomResponse(responses.explain);
        } else if (message.includes('similar') || message.includes('related') || message.includes('find')) {
            return this.getRandomResponse(responses.similar);
        } else {
            return this.getRandomResponse(responses.default);
        }
    }

    // Get random response from array
    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Setup AI assistant suggestions
    setupAIAssistantSuggestions() {
        const suggestionBtns = document.querySelectorAll('.suggestion-btn');
        const input = document.getElementById('aiAssistantInput');
        
        if (!input) return;

        suggestionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const suggestion = btn.getAttribute('data-suggestion');
                if (suggestion) {
                    input.value = suggestion;
                    input.focus();
                }
            });
        });
    }

    // Setup live activity monitor with system metrics
    setupLiveActivityMonitor() {
        this.createSystemMetrics();
        this.startActivityStream();
        this.startSystemMonitoring();
    }

    // Create system metrics
    createSystemMetrics() {
        const systemMetrics = document.getElementById('systemMetrics');
        if (!systemMetrics) return;

        const metrics = [
            {
                id: 'cpu',
                label: 'CPU Usage',
                value: '45%',
                icon: '⚡',
                type: 'cpu'
            },
            {
                id: 'memory',
                label: 'Memory',
                value: '2.1GB',
                icon: '💾',
                type: 'memory'
            },
            {
                id: 'network',
                label: 'Network',
                value: '12.5MB/s',
                icon: '🌐',
                type: 'network'
            },
            {
                id: 'storage',
                label: 'Storage',
                value: '156GB',
                icon: '💿',
                type: 'storage'
            }
        ];

        systemMetrics.innerHTML = '';

        metrics.forEach(metric => {
            const metricDiv = document.createElement('div');
            metricDiv.className = 'system-metric';
            metricDiv.innerHTML = `
                <div class="system-metric-icon ${metric.type}">
                    <span>${metric.icon}</span>
                </div>
                <div class="system-metric-info">
                    <div class="system-metric-label">${metric.label}</div>
                    <div class="system-metric-value">${metric.value}</div>
                </div>
            `;
            systemMetrics.appendChild(metricDiv);
        });
    }

    // Start activity stream
    startActivityStream() {
        const activityStream = document.getElementById('activityStream');
        if (!activityStream) return;

        // Generate initial activities
        this.generateActivityEvents();

        // Add new activities periodically
        setInterval(() => {
            this.addActivityEvent();
        }, 3000);
    }

    // Generate initial activity events
    generateActivityEvents() {
        const activityStream = document.getElementById('activityStream');
        if (!activityStream) return;

        const initialActivities = [
            {
                type: 'user-join',
                message: 'New user joined the platform',
                time: '2 minutes ago',
                location: 'San Francisco, CA'
            },
            {
                type: 'story-read',
                message: 'User read "AI Breakthrough in Neural Networks"',
                time: '5 minutes ago',
                location: 'New York, NY'
            },
            {
                type: 'comment',
                message: 'New comment on "Quantum Computing Update"',
                time: '8 minutes ago',
                location: 'London, UK'
            },
            {
                type: 'share',
                message: 'Story shared on social media',
                time: '12 minutes ago',
                location: 'Tokyo, Japan'
            }
        ];

        initialActivities.forEach(activity => {
            this.addActivityEvent(activity);
        });
    }

    // Add activity event
    addActivityEvent(activity = null) {
        const activityStream = document.getElementById('activityStream');
        if (!activityStream) return;

        if (!activity) {
            activity = this.generateRandomActivity();
        }

        const eventDiv = document.createElement('div');
        eventDiv.className = 'activity-event';
        eventDiv.innerHTML = `
            <div class="activity-event-icon ${activity.type}">
                <span>${this.getActivityIcon(activity.type)}</span>
            </div>
            <div class="activity-event-content">
                <div class="activity-event-message">${activity.message}</div>
                <div class="activity-event-time">${activity.time}</div>
                ${activity.location ? `<div class="activity-event-location">${activity.location}</div>` : ''}
            </div>
        `;

        // Add to top of stream
        activityStream.insertBefore(eventDiv, activityStream.firstChild);

        // Remove old events if too many
        const events = activityStream.querySelectorAll('.activity-event');
        if (events.length > 10) {
            events[events.length - 1].remove();
        }
    }

    // Generate random activity
    generateRandomActivity() {
        const activities = [
            {
                type: 'user-join',
                messages: [
                    'New user joined the platform',
                    'User registered for tech updates',
                    'New member joined the community'
                ],
                locations: ['San Francisco, CA', 'New York, NY', 'London, UK', 'Tokyo, Japan', 'Berlin, Germany']
            },
            {
                type: 'story-read',
                messages: [
                    'User read trending tech story',
                    'Article viewed by new reader',
                    'Story engagement increased'
                ],
                locations: ['Global', 'North America', 'Europe', 'Asia']
            },
            {
                type: 'comment',
                messages: [
                    'New comment on tech discussion',
                    'User engaged with article',
                    'Community discussion started'
                ],
                locations: ['Online', 'Community Forum', 'Discussion Board']
            },
            {
                type: 'share',
                messages: [
                    'Story shared on social media',
                    'Article bookmarked by user',
                    'Content shared with network'
                ],
                locations: ['Twitter', 'LinkedIn', 'Facebook', 'Reddit']
            },
            {
                type: 'search',
                messages: [
                    'User searched for tech topics',
                    'New search query processed',
                    'Search trend detected'
                ],
                locations: ['Search Engine', 'Platform Search', 'Global']
            },
            {
                type: 'bookmark',
                messages: [
                    'Article bookmarked for later',
                    'User saved interesting story',
                    'Content added to reading list'
                ],
                locations: ['Personal Library', 'Reading List', 'Bookmarks']
            }
        ];

        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const randomMessage = randomActivity.messages[Math.floor(Math.random() * randomActivity.messages.length)];
        const randomLocation = randomActivity.locations[Math.floor(Math.random() * randomActivity.locations.length)];

        return {
            type: randomActivity.type,
            message: randomMessage,
            time: this.getRandomTimeAgo(),
            location: randomLocation
        };
    }

    // Get activity icon
    getActivityIcon(type) {
        const icons = {
            'user-join': '👤',
            'story-read': '📖',
            'comment': '💬',
            'share': '📤',
            'search': '🔍',
            'bookmark': '🔖'
        };
        return icons[type] || '📊';
    }

    // Get random time ago
    getRandomTimeAgo() {
        const times = [
            'Just now',
            '1 minute ago',
            '2 minutes ago',
            '5 minutes ago',
            '10 minutes ago',
            '15 minutes ago',
            '30 minutes ago',
            '1 hour ago'
        ];
        return times[Math.floor(Math.random() * times.length)];
    }

    // Start system monitoring
    startSystemMonitoring() {
        // Update system metrics every 5 seconds
        setInterval(() => {
            this.updateSystemMetrics();
        }, 5000);
    }

    // Update system metrics
    updateSystemMetrics() {
        const metrics = document.querySelectorAll('.system-metric-value');
        if (!metrics.length) return;

        // Update CPU usage
        if (metrics[0]) {
            const cpuUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
            metrics[0].textContent = `${cpuUsage}%`;
        }

        // Update memory usage
        if (metrics[1]) {
            const memoryUsage = (Math.random() * 2 + 1.5).toFixed(1); // 1.5-3.5GB
            metrics[1].textContent = `${memoryUsage}GB`;
        }

        // Update network speed
        if (metrics[2]) {
            const networkSpeed = (Math.random() * 20 + 5).toFixed(1); // 5-25MB/s
            metrics[2].textContent = `${networkSpeed}MB/s`;
        }

        // Update storage
        if (metrics[3]) {
            const storage = Math.floor(Math.random() * 50) + 120; // 120-170GB
            metrics[3].textContent = `${storage}GB`;
        }
    }

    // Setup enhanced right panel with advanced features
    setupEnhancedRightPanel() {
        this.setupPanelHeaderEffects();
        this.setupNewsTabs();
        this.setupNewsSorting();
        this.setupPanelActions();
        this.setupNewsInteractions();
        this.setupLoadingStates();
    }

    // Setup panel header effects
    setupPanelHeaderEffects() {
        this.createPanelHeaderParticles();
        this.updatePanelStats();
    }

    // Create panel header particles
    createPanelHeaderParticles() {
        const particlesContainer = document.getElementById('panelHeaderParticles');
        if (!particlesContainer) return;

        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'panel-header-particle';
            
            // Random positioning
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            
            // Random animation delay
            particle.style.animationDelay = Math.random() * 6 + 's';
            
            // Random animation duration
            particle.style.animationDuration = (4 + Math.random() * 4) + 's';
            
            particlesContainer.appendChild(particle);
        }
    }

    // Update panel stats
    updatePanelStats() {
        const storyCount = document.getElementById('panelStoryCount');
        const updateTime = document.getElementById('panelUpdateTime');
        
        if (storyCount) {
            const currentStories = document.querySelectorAll('.story').length;
            this.animateValue(storyCount, parseInt(storyCount.textContent) || 0, currentStories, 1000);
        }
        
        if (updateTime) {
            const timeAgo = this.getTimeAgo();
            updateTime.textContent = timeAgo;
        }
    }

    // Get time ago string
    getTimeAgo() {
        const now = new Date();
        const lastUpdate = this.lastFetchTime || now;
        const diffMs = now - lastUpdate;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d`;
    }

    // Setup news tabs (commented out since we simplified categorization)
    setupNewsTabs() {
        // News tabs functionality commented out since we removed the tabs from HTML
        // const tabs = document.querySelectorAll('.news-tab');
        // if (!tabs.length) return;

        // tabs.forEach(tab => {
        //     tab.addEventListener('click', () => {
        //         // Remove active class from all tabs
        //         tabs.forEach(t => t.classList.remove('active'));
        //         
        //         // Add active class to clicked tab
        //         tab.classList.add('active');
        //         
        //         // Filter stories based on category
        //         const category = tab.getAttribute('data-category');
        //         this.filterStoriesByCategory(category);
        //     });
        // });
    }

    // Filter stories by category (commented out since we simplified categorization)
    filterStoriesByCategory(category) {
        // Category filtering functionality commented out since we removed the tabs
        // const stories = document.querySelectorAll('.story');
        // if (!stories.length) return;

        // stories.forEach(story => {
        //     const storyCategory = story.getAttribute('data-category') || 'all';
        //     const isTrending = story.classList.contains('trending');
        //     
        //     let shouldShow = false;
        //     
        //     switch (category) {
        //         case 'all':
        //             shouldShow = true;
        //             break;
        //         case 'trending':
        //             shouldShow = isTrending;
        //             break;
        //         case 'ai':
        //             shouldShow = storyCategory === 'ai';
        //             break;
        //         case 'tech':
        //             shouldShow = storyCategory === 'tech';
        //             break;
        //         case 'startup':
        //             shouldShow = storyCategory === 'startup';
        //             break;
        //         default:
        //             shouldShow = true;
        //     }
        //     
        //     if (shouldShow) {
        //         story.style.display = 'block';
        //         story.style.animation = 'storySlideIn 0.5s ease-out';
        //     } else {
        //         story.style.display = 'none';
        //     }
        // });
    }

    // Setup news sorting
    setupNewsSorting() {
        const sortSelect = document.getElementById('sortSelect');
        if (!sortSelect) return;

        sortSelect.addEventListener('change', (e) => {
            const sortBy = e.target.value;
            this.sortStories(sortBy);
        });
    }

    // Sort stories
    sortStories(sortBy) {
        const storiesContainer = document.getElementById('stories');
        if (!storiesContainer) return;

        const stories = Array.from(storiesContainer.querySelectorAll('.story'));
        
        stories.sort((a, b) => {
            switch (sortBy) {
                case 'score':
                    const scoreA = parseInt(a.getAttribute('data-score')) || 0;
                    const scoreB = parseInt(b.getAttribute('data-score')) || 0;
                    return scoreB - scoreA;
                case 'time':
                    const timeA = new Date(a.getAttribute('data-time') || 0);
                    const timeB = new Date(b.getAttribute('data-time') || 0);
                    return timeB - timeA;
                case 'comments':
                    const commentsA = parseInt(a.getAttribute('data-comments')) || 0;
                    const commentsB = parseInt(b.getAttribute('data-comments')) || 0;
                    return commentsB - commentsA;
                default:
                    return 0;
            }
        });

        // Re-append sorted stories
        stories.forEach((story, index) => {
            storiesContainer.appendChild(story);
            story.style.animation = `storySlideIn 0.5s ease-out ${index * 0.1}s both`;
        });
    }

    // Setup panel actions
    setupPanelActions() {
        const refreshBtn = document.getElementById('refreshBtn');
        const settingsBtn = document.getElementById('settingsBtn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.handleRefresh();
            });
        }


        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.handleSettings();
            });
        }
    }

    // Handle refresh action
    async handleRefresh() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (!refreshBtn) return;

        // Add loading state to button
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        
        // Add visual feedback to button
        const originalHTML = refreshBtn.innerHTML;
        refreshBtn.style.opacity = '0.7';

        try {
            console.log('Refresh button clicked - forcing fresh data fetch...');
            
            // Show loading state in main UI
            this.showLoading();
            this.hideError();
            
            // Show immediate feedback
            this.showNotification('Refreshing stories...', 'info');
            
            // Clear cache to force fresh fetch
            await hnCache.clearCache();
            console.log('Cache cleared, fetching fresh data...');
            
            // Add small delay to show loading state
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Force fresh API call
            const stories = await this.fetchStoriesWithRetry();
            if (stories && stories.length > 0) {
                await hnCache.saveStoriesToCache(stories);
                this.stories = stories.slice(0, 20);
                this.displayStories();
                this.showNotification('Stories refreshed successfully!', 'success');
                console.log('Stories refreshed successfully');
            } else {
                throw new Error('No stories received from API');
            }
        } catch (error) {
            console.error('Refresh failed:', error);
            this.showNotification('Failed to refresh stories. Please try again.', 'error');
            this.showError('Failed to refresh stories. Please check your connection.');
        } finally {
            // Remove loading state from button
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
            refreshBtn.style.opacity = '1';
            refreshBtn.innerHTML = originalHTML;
        }
    }


    // Handle settings
    handleSettings() {
        // Open settings modal (could be implemented)
        this.showNotification('Settings opened', 'info');
    }

    // Setup news interactions
    setupNewsInteractions() {
        // Add bookmark functionality
        document.addEventListener('click', (e) => {
            const bookmarkBtn = e.target.closest('.bookmark-btn');
            if (bookmarkBtn) {
                e.preventDefault();
                e.stopPropagation();
                this.handleBookmark(bookmarkBtn);
                return;
            }
            
            const shareBtn = e.target.closest('.share-btn');
            if (shareBtn) {
                e.preventDefault();
                e.stopPropagation();
                this.handleShare(shareBtn);
                return;
            }
            
        });
    }

    // Handle bookmark
    handleBookmark(btn) {
        if (!btn || typeof btn.closest !== 'function') {
            console.warn('Invalid button element in handleBookmark');
            return;
        }
        
        const story = btn.closest('.story');
        if (!story) {
            console.warn('Could not find parent story element');
            return;
        }
        
        const storyId = story.getAttribute('data-id');
        
        if (btn.classList.contains('bookmarked')) {
            btn.classList.remove('bookmarked');
            btn.innerHTML = '🔖';
            this.showNotification('Removed from bookmarks', 'info');
        } else {
            btn.classList.add('bookmarked');
            btn.innerHTML = '🔖';
            btn.style.color = '#f59e0b';
            this.showNotification('Added to bookmarks', 'success');
        }
    }

    // Handle share
    handleShare(btn) {
        if (!btn || typeof btn.closest !== 'function') {
            console.warn('Invalid button element in handleShare');
            return;
        }
        
        const story = btn.closest('.story');
        if (!story) {
            console.warn('Could not find parent story element');
            return;
        }
        
        const titleElement = story.querySelector('.story-title');
        const title = titleElement ? titleElement.textContent : 'Untitled';
        const url = story.getAttribute('data-url') || '';
        
        if (navigator.share) {
            navigator.share({
                title: title,
                url: url
            });
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(url);
            this.showNotification('Link copied to clipboard', 'success');
        }
    }


    // Setup loading states
    setupLoadingStates() {
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.handleRetry();
            });
        }
    }

    // Handle retry
    async handleRetry() {
        const errorState = document.getElementById('error');
        const loadingState = document.getElementById('loading');
        
        if (errorState) errorState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'flex';
        
        try {
            await this.loadStories();
        } catch (error) {
            if (errorState) errorState.style.display = 'flex';
            if (loadingState) loadingState.style.display = 'none';
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(17, 24, 39, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px 16px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            backdrop-filter: blur(12px);
            animation: notificationSlideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'notificationSlideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Get notification icon
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        return icons[type] || 'ℹ️';
    }
}

// Initialize the new tab page when it loads
document.addEventListener('DOMContentLoaded', () => {
    const reader = new NewTabHackerNewsReader();
    reader.setupMessageListener();
});

// Also initialize if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    const reader = new NewTabHackerNewsReader();
    reader.setupMessageListener();
}
