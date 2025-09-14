const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storyId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['saved', 'read-later'],
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  author: {
    type: String,
    default: 'unknown'
  },
  comments: {
    type: Number,
    default: 0
  },
  savedAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
});

// Compound index to prevent duplicate saves
articleSchema.index({ userId: 1, storyId: 1, type: 1 }, { unique: true });

// Virtual for time since saved
articleSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffInMinutes = Math.floor((now - this.savedAt) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
});

// Ensure virtual fields are serialized
articleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Article', articleSchema);
