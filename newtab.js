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

// New Tab Hacker News Reader
class NewTabHackerNewsReader {
    constructor() {
        this.stories = [];
        this.init();
    }

    // Initialize the new tab page
    init() {
        this.setupEventListeners();
        this.loadStories();
        this.loadSettings();
        this.loadCustomShortcuts();
        this.initChromeFunctionality();
    }

    // Set up event listeners
    setupEventListeners() {
        // Force refresh button
        const forceRefreshBtn = document.getElementById('forceRefreshBtn');
        forceRefreshBtn.addEventListener('click', () => {
            this.forceRefresh();
        });

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });

        // Toggle button (minimize/expand)
        const toggleBtn = document.getElementById('toggleBtn');
        toggleBtn.addEventListener('click', () => {
            this.toggleWidget();
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

        // Close add shortcut modal when clicking outside
        const addShortcutModal = document.getElementById('addShortcutModal');
        addShortcutModal.addEventListener('click', (e) => {
            if (e.target === addShortcutModal) {
                this.closeAddShortcutModal();
            }
        });

        // Close custom URL modal when clicking outside
        const customUrlModal = document.getElementById('customUrlModal');
        customUrlModal.addEventListener('click', (e) => {
            if (e.target === customUrlModal) {
                this.closeCustomUrlModal();
            }
        });

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
        addShortcutBtn.addEventListener('click', () => {
            this.openAddShortcutModal();
        });

        // Add shortcut modal close buttons
        const closeAddShortcutModal = document.getElementById('closeAddShortcutModal');
        closeAddShortcutModal.addEventListener('click', () => {
            this.closeAddShortcutModal();
        });

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
        addCustomUrlBtn.addEventListener('click', () => {
            this.openCustomUrlModal();
        });

        // Custom URL modal close buttons
        const closeCustomUrlModal = document.getElementById('closeCustomUrlModal');
        closeCustomUrlModal.addEventListener('click', () => {
            this.closeCustomUrlModal();
        });

        const cancelCustomUrl = document.getElementById('cancelCustomUrl');
        cancelCustomUrl.addEventListener('click', () => {
            this.closeCustomUrlModal();
        });

        // Save shortcut
        const saveShortcut = document.getElementById('saveShortcut');
        saveShortcut.addEventListener('click', () => {
            this.saveCustomShortcut();
        });
    }

    // Load stories from Hacker News API with cache-first approach
    async loadStories() {
        try {
            // Step 1: Check cache first
            const cached = await hnCache.getCachedStories();
            
            if (cached && hnCache.isCacheFresh(cached.timestamp)) {
                // Cache is fresh - show immediately
                console.log('Loading stories from cache (fresh data)');
                this.stories = cached.stories.slice(0, 20); // New tab shows up to 20 stories
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

            // Step 4: Get details for the first 20 stories (more for new tab page)
            const topStoryIds = storyIds.slice(0, 20);
            
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
                this.stories = cached.stories.slice(0, 20);
                this.displayStories();
                this.showStaleDataWarning();
            } else {
                this.showError();
            }
        }
    }

    // Fetch individual story details
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

    // Display stories in the UI
    displayStories() {
        const storiesContainer = document.getElementById('stories');
        const loadingElement = document.getElementById('loading');
        
        // Hide loading
        loadingElement.style.display = 'none';
        storiesContainer.style.display = 'flex';
        
        // Clear previous stories
        storiesContainer.innerHTML = '';
        
        // Filter out any null stories (failed fetches)
        const validStories = this.stories.filter(story => story !== null);
        
        if (validStories.length === 0) {
            storiesContainer.innerHTML = '<div class="error">No stories found</div>';
            return;
        }

        // Create HTML for each story
        validStories.forEach((story, index) => {
            const storyElement = this.createStoryElement(story);
            storiesContainer.appendChild(storyElement);
        });
    }

    // Create HTML element for a single story
    createStoryElement(story) {
        const storyDiv = document.createElement('div');
        storyDiv.className = 'story';
        
        // Format the time
        const timeAgo = this.formatTimeAgo(story.time);
        
        // Create the HTML structure
        storyDiv.innerHTML = `
            <div class="story-title">
                <a href="${story.url || `https://news.ycombinator.com/item?id=${story.id}`}" 
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

    // UI state management
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

    // Toggle widget minimize/expand
    toggleWidget() {
        const widget = document.getElementById('hnWidget');
        const toggleBtn = document.getElementById('toggleBtn');
        
        if (widget.classList.contains('minimized')) {
            widget.classList.remove('minimized');
            toggleBtn.textContent = '−';
            toggleBtn.title = 'Minimize';
        } else {
            widget.classList.add('minimized');
            toggleBtn.textContent = '+';
            toggleBtn.title = 'Expand';
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
        warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ffa500 0%, #ff8c00 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 16px rgba(255, 165, 0, 0.3);
            max-width: 300px;
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
                this.stories = message.stories.slice(0, 20); // New tab shows up to 20 stories
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
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
            max-width: 300px;
        `;
        notificationDiv.textContent = '✅ Stories updated in background';
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
}

// Initialize the new tab page when it loads
document.addEventListener('DOMContentLoaded', () => {
    const reader = new NewTabHackerNewsReader();
    reader.setupMessageListener();
});
