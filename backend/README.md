# Hacker News Extension Backend API

A Node.js + Express + MongoDB backend for the Hacker News Chrome Extension with user authentication and article saving features.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment variables:**
```bash
# Copy the config file
cp config.env.example config.env

# Edit config.env with your settings
nano config.env
```

3. **Start MongoDB:**
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in config.env
```

4. **Run the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Articles
- `POST /api/articles/save` - Save article
- `GET /api/articles/saved` - Get saved articles
- `GET /api/articles/read-later` - Get read-later articles
- `GET /api/articles/all` - Get all user articles
- `PUT /api/articles/:id` - Update article
- `DELETE /api/articles/:id` - Delete article
- `GET /api/articles/check/:storyId` - Check if article is saved

### Health Check
- `GET /api/health` - API health status

## 🔧 Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/hackernews_extension

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 📝 API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Save Article
```bash
curl -X POST http://localhost:3000/api/articles/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "storyId": "12345",
    "title": "Amazing Article",
    "url": "https://example.com/article",
    "type": "saved",
    "score": 100,
    "author": "author123"
  }'
```

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  createdAt: Date,
  lastLogin: Date
}
```

### Articles Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  storyId: String,
  title: String,
  url: String,
  type: String (enum: ['saved', 'read-later']),
  score: Number,
  author: String,
  comments: Number,
  savedAt: Date,
  readAt: Date,
  tags: [String],
  notes: String
}
```

## 🧹 Automatic Article Cleanup

The backend includes an automatic cleanup service that removes old articles:

- **Read Later articles:** Deleted after 15 days
- **Saved articles:** Deleted after 1 year (365 days)
- **Schedule:** Runs daily at 2:00 AM
- **User notification:** Retention policy displayed in the articles modal

For more details, see [ARTICLE_RETENTION_POLICY.md](../ARTICLE_RETENTION_POLICY.md)

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- Error handling

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```bash
docker build -t hackernews-backend .
docker run -p 3000:3000 hackernews-backend
```

## 📱 Chrome Extension Integration

The backend is designed to work with the Chrome extension. Make sure to:

1. Update the API base URL in the extension
2. Handle authentication tokens
3. Implement error handling
4. Add offline support

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify MONGODB_URI in config.env

2. **JWT Token Error**
   - Ensure JWT_SECRET is set
   - Check token format in requests

3. **CORS Error**
   - Update CORS_ORIGIN in config.env
   - Check Chrome extension origin

### Logs
Check console output for detailed error messages and debugging information.

## 📄 License

MIT License - see LICENSE file for details.
