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

    // Main function to load stories from Hacker News API
    async loadStories() {
        try {
            this.showLoading();
            this.hideError();

            // Step 1: Get the list of top story IDs
            const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const storyIds = await response.json();

            // Step 2: Get details for the first 10 stories
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
            
            // Step 3: Display the stories
            this.displayStories();
            
        } catch (error) {
            this.showError();
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
}

// Initialize the extension when the popup loads
// This is like React's main App component
document.addEventListener('DOMContentLoaded', () => {
    new HackerNewsReader();
});
