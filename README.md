# VU tech - Hacker News Chrome Extension

A beautiful, modern Chrome extension that brings Hacker News stories to your browser with a stunning UI, personalized greetings, and powerful features for tech enthusiasts.

![VU tech Banner](icons/image.png)

## ✨ Features

### **Core Features**
- 📰 **Real-time Hacker News stories** - Always stay updated with the latest tech news
- 🎨 **Beautiful dark theme** - Modern gradient UI with smooth animations
- 🚀 **Fast caching system** - Stories cached for 30 minutes for instant loading
- 🔄 **Auto-refresh** - Background updates every 30 minutes
- 💾 **Smart fallback** - Works offline with cached data

### **Personalization**
- 👋 **Dynamic greetings** - Personalized "Hi [username]" with 25+ rotating motivational messages
- 🎯 **Unique usernames** - Create your own unique identity
- 👤 **User authentication** - Secure login/registration system
- 📊 **User profiles** - Track your saved articles and reading history

### **Reading Features**
- 📑 **Save articles** - Bookmark articles for permanent storage (1-year retention)
- ⏰ **Read later** - Quick save for short-term reading (15-day retention)
- 🔍 **Quick search** - Built-in search functionality
- 🎯 **Quick shortcuts** - Fast access to your favorite tech sites

### **Extension Features**
- 🆕 **New tab override** - Replace your new tab with VU tech (optional)
- 📱 **Browser popup** - Quick access from toolbar
- 🔔 **Smart notifications** - Success/error feedback for all actions
- ⚡ **Performance optimized** - Lightweight and fast

## 🖼️ Screenshots

<!-- Add your screenshots here -->
```
screenshots/
├── newtab-view.png
├── popup-view.png
├── login-modal.png
└── saved-articles.png
```

## 🛠️ Tech Stack

### **Frontend**
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- Chrome Extension APIs
- Hacker News API

### **Backend**
- Node.js
- Express.js
- MongoDB
- JWT Authentication
- bcrypt for password hashing

### **Additional Tools**
- node-cron (automated cleanup)
- CORS handling
- Rate limiting
- Helmet.js (security)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (local or MongoDB Atlas account) - [Download here](https://www.mongodb.com/)
- **Google Chrome** browser
- **Git** (optional, for cloning)

## 🚀 Installation Guide

### **Step 1: Clone or Download the Repository**

**Option A: Using Git**
```bash
git clone https://github.com/YOUR_USERNAME/hacker-news-extension.git
cd hacker-news-extension
```

**Option B: Download ZIP**
1. Click the green "Code" button on GitHub
2. Select "Download ZIP"
3. Extract the ZIP file to your desired location
4. Navigate to the extracted folder

---

### **Step 2: Backend Setup**

#### **2.1 Install Backend Dependencies**

```bash
cd backend
npm install
```

#### **2.2 Configure Environment Variables**

Create a `config.env` file in the `backend` directory:

```bash
# In the backend folder
touch config.env
```

Add the following configuration to `config.env`:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/hackernews_extension
# For MongoDB Atlas, use:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hackernews_extension

# JWT Secret (change this to a random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_to_something_random

# Server Port
PORT=3000

# Environment
NODE_ENV=development
```

**Important:** Change `JWT_SECRET` to a strong, random string for security!

#### **2.3 Start MongoDB**

**For Local MongoDB:**
```bash
# macOS/Linux
mongod

# Windows
"C:\Program Files\MongoDB\Server\X.X\bin\mongod.exe"
```

**For MongoDB Atlas:**
- No need to start anything locally
- Just use your connection string in `MONGODB_URI`

#### **2.4 Start the Backend Server**

```bash
# From the backend directory
npm start

# For development with auto-restart
npm run dev
```

You should see:
```
✅ Connected to MongoDB
✅ Cleanup service started - will run daily at 2:00 AM
🚀 Server running on port 3000
📊 Health check: http://localhost:3000/api/health
```

**Keep this terminal window open!** The backend needs to run for the extension to work.

---

### **Step 3: Load Extension in Chrome**

#### **3.1 Open Chrome Extensions Page**

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)

#### **3.2 Load the Extension**

1. Click **"Load unpacked"**
2. Navigate to your project folder (the root folder, NOT the backend folder)
3. Select the folder and click **"Select Folder"** or **"Open"**

#### **3.3 Verify Installation**

You should see:
- ✅ VU tech extension card with icon
- ✅ Extension enabled (toggle is ON)
- ✅ No errors shown

---

### **Step 4: Configure New Tab (Optional)**

If you want VU tech to replace your Chrome new tab page:

1. Click the extension icon in Chrome toolbar
2. Click the settings icon (⚙️)
3. Enable "Use VU tech as New Tab Page"
4. Click "Save Settings"

Now every new tab will show VU tech!

---

## 🎯 Usage Guide

### **First Time Setup**

1. **Open the extension** (click icon in toolbar or open new tab)
2. **Register an account**:
   - Click "Sign Up" 
   - Choose a unique username (3-20 characters)
   - Enter your name, email, and password
   - Click "Create Account"
3. **You're ready!** Start exploring tech news

### **Reading & Saving Articles**

**Save Article (1-year retention):**
- Hover over any story
- Click the "Save" button (💾)
- Access saved articles from your profile

**Read Later (15-day retention):**
- Hover over any story
- Click the "Read Later" button (🕐)
- Perfect for quick bookmarks

**View Your Articles:**
- Click your profile icon
- Select "View Saved Articles" or "View Read Later"

### **Toggle Between Types**

In the articles modal, you can:
- Move articles from Read Later → Saved (for longer retention)
- Move articles from Saved → Read Later
- Remove articles you no longer need

### **Popup vs New Tab**

**Popup** (click extension icon):
- Quick access to 10 latest stories
- Compact view
- Force refresh option

**New Tab** (open new tab if enabled):
- Full experience with 20+ stories
- Load more functionality
- Search and shortcuts
- Dynamic greeting messages

---

## 🔧 Troubleshooting

### **Common Issues**

#### **"Failed to load stories" error**
- ✅ Check if backend server is running (see terminal)
- ✅ Verify MongoDB is running
- ✅ Check backend URL is `http://localhost:3000`

#### **"Network error" on login/register**
- ✅ Ensure backend is running on port 3000
- ✅ Check `config.env` file exists and is configured
- ✅ Verify no firewall blocking localhost:3000

#### **"Username already exists"**
- ✅ Choose a different username
- ✅ Usernames must be unique across all users

#### **Extension not loading**
- ✅ Refresh the extension: Go to `chrome://extensions/` → Click refresh icon
- ✅ Check for errors in Chrome DevTools (F12)
- ✅ Verify all files are present in the extension folder

#### **New tab not working**
- ✅ Go to extension settings and enable "Use VU tech as New Tab Page"
- ✅ Close all existing tabs and open a new one
- ✅ Check if another extension is overriding new tab

#### **MongoDB connection failed**
- ✅ Ensure MongoDB service is running
- ✅ Check `MONGODB_URI` in `config.env`
- ✅ Verify MongoDB port (default: 27017)

### **Getting Logs**

**Backend Logs:**
```bash
# Check the terminal where you ran 'npm start'
# Look for error messages
```

**Extension Logs:**
1. Right-click extension icon → "Inspect popup" (for popup logs)
2. Open new tab → F12 (for new tab logs)
3. Check Console tab for errors

---

## 📁 Project Structure

```
hacker-news-extension/
├── backend/                    # Backend server
│   ├── config.env             # Environment variables (create this)
│   ├── middleware/            # Auth middleware
│   ├── models/                # MongoDB models
│   ├── routes/                # API routes
│   ├── services/              # Background services
│   ├── server.js              # Main server file
│   └── package.json           # Backend dependencies
│
├── icons/                      # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── image.png
│
├── manifest.json              # Extension configuration
├── background.js              # Background script
├── popup.html                 # Popup HTML
├── popup.js                   # Popup JavaScript
├── popup.css                  # Popup styles
├── newtab.html               # New tab HTML
├── newtab.js                 # New tab JavaScript
├── newtab.css                # New tab styles
└── README.md                 # This file
```

---

## 🗄️ Database Schema

### **Users Collection**
```javascript
{
  username: String (unique, 3-20 chars),
  email: String (unique),
  password: String (hashed),
  name: String,
  createdAt: Date,
  lastLogin: Date
}
```

### **Articles Collection**
```javascript
{
  userId: ObjectId (ref: User),
  storyId: String,
  title: String,
  url: String,
  type: String ('saved' | 'read-later'),
  score: Number,
  author: String,
  comments: Number,
  savedAt: Date
}
```

---

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input validation
- ✅ XSS prevention

---

## 🎨 Customization

### **Change Greeting Messages**

Edit `newtab.js` around line 165:
```javascript
this.greetingMessages = [
    "your custom message here",
    "another message",
    // Add your own messages
];
```

### **Change Cache Duration**

Edit `newtab.js` around line 4:
```javascript
this.CACHE_DURATION = 30 * 60 * 1000; // Change 30 to your desired minutes
```

### **Change Article Retention**

Edit `backend/services/cleanupService.js`:
```javascript
this.READ_LATER_RETENTION_DAYS = 15;  // Change days
this.SAVED_RETENTION_DAYS = 365;       // Change days
```

---

## 📝 API Endpoints

### **Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### **Articles**
- `POST /api/articles/save` - Save article
- `GET /api/articles/saved` - Get saved articles
- `GET /api/articles/read-later` - Get read-later articles
- `DELETE /api/articles/:id` - Delete article

### **Health Check**
- `GET /api/health` - Check API status

---

## 🔄 Auto-Cleanup

The extension automatically cleans up old articles:
- **Read Later**: Deleted after 15 days
- **Saved**: Deleted after 1 year
- **Schedule**: Runs daily at 2:00 AM

See [ARTICLE_RETENTION_POLICY.md](ARTICLE_RETENTION_POLICY.md) for details.

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### **Contribution Guidelines**
- Follow existing code style
- Test your changes thoroughly
- Update documentation as needed
- Write clear commit messages

---

## 🐛 Known Issues

- Background script may timeout on slow connections (fallback to cached data)
- Some stories may not have URLs (HN Ask/Show posts)
- Cache may become stale if offline for extended periods

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Hacker News** for the amazing API
- **Firebase** for hosting the Hacker News data
- **Chrome Extensions** documentation and community

---

## 📧 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/YOUR_USERNAME/hacker-news-extension/issues)
3. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Error messages (if any)
   - Your environment (OS, Chrome version, Node version)

---

## 🌟 Star the Project

If you find this extension helpful, please consider giving it a ⭐ on GitHub!

---

## 📸 Demo

<!-- Add GIFs or videos showing the extension in action -->

### New Tab Experience
![New Tab Demo](screenshots/newtab-demo.gif)

### Popup View
![Popup Demo](screenshots/popup-demo.gif)

### Saving Articles
![Save Demo](screenshots/save-demo.gif)

---

## 🚧 Roadmap

- [ ] Dark/Light theme toggle
- [ ] Custom shortcut management
- [ ] Article search and filtering
- [ ] Export saved articles
- [ ] Browser sync across devices
- [ ] Keyboard shortcuts
- [ ] Reading time estimates
- [ ] Categories and tags
- [ ] Comments preview

---

**Made with ❤️ by Abhinav Verma**

**Happy Reading! 📰✨**

---

#HackerNews #ChromeExtension #TechNews #JavaScript #NodeJS #MongoDB #OpenSource #WebDevelopment #DarkTheme #ModernUI

