# VU tech Extension - Testing Guide

## 🚀 Quick Start

### 1. Load the Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/Users/abhinavverma/Documents/Projects/hacker-news-extension` folder
5. The extension should appear in your extensions list

### 2. Test the New Tab Page
1. Open a new tab (Ctrl/Cmd + T)
2. You should see the VU tech logo above the search bar
3. The page should show either:
   - Live Hacker News stories (if internet is working)
   - Sample stories (if offline/API issues)

### 3. Test the Popup
1. Click the VU tech extension icon in the toolbar
2. You should see the popup with the VU tech logo
3. Stories should load in the popup

## 🎨 Visual Features to Check

### VU tech Theme
- ✅ Blue color scheme throughout (instead of orange)
- ✅ VU tech logo displayed prominently
- ✅ Modern, futuristic design
- ✅ Glowing effects on interactive elements

### Functionality
- ✅ Search bar works
- ✅ Shortcuts can be added/removed
- ✅ Stories display with proper formatting
- ✅ Error handling shows helpful messages
- ✅ Offline mode shows sample stories

## 🔧 Troubleshooting

### If you see "Failed to fetch" errors:
1. Check your internet connection
2. The extension will show sample stories as fallback
3. Check browser console for detailed error messages

### If the extension doesn't load:
1. Make sure all files are in the correct directory
2. Check that manifest.json is valid
3. Reload the extension in chrome://extensions/

### If stories don't appear:
1. Check browser console for errors
2. Try refreshing the page
3. The extension has offline fallback with sample stories

## 🎯 Expected Behavior

### Online Mode
- Fetches real Hacker News stories
- Shows live updates
- Caches stories for 30 minutes
- Displays "Live" indicator

### Offline Mode
- Shows sample stories with VU Tech branding
- Displays warning message
- Still allows all other functionality

## 📱 Testing Checklist

- [ ] Extension loads without errors
- [ ] VU tech logo appears on new tab page
- [ ] VU tech logo appears in popup
- [ ] Blue theme is applied throughout
- [ ] Search functionality works
- [ ] Stories display (live or sample)
- [ ] Shortcuts can be added/removed
- [ ] Error handling works gracefully
- [ ] Offline mode shows sample stories
- [ ] All animations and effects work smoothly

## 🚨 Known Issues

1. **CORS Errors**: These are normal when testing locally. The extension handles them gracefully.
2. **Backend Server**: Authentication requires the backend server running on localhost:3000
3. **Chrome Security**: Some features may be limited in chrome://newtab/ context

## 🎉 Success!

If you see the VU tech logo and blue theme working, the extension is successfully implemented!
