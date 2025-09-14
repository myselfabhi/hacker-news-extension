const express = require('express');
const Article = require('../models/Article');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Save article
router.post('/save', protect, async (req, res) => {
  try {
    const { storyId, title, url, type, score, author, comments, tags, notes } = req.body;

    // Validation
    if (!storyId || !title || !url || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide storyId, title, url, and type'
      });
    }

    if (!['saved', 'read-later'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "saved" or "read-later"'
      });
    }

    // Check if already exists
    const existingArticle = await Article.findOne({
      userId: req.user._id,
      storyId,
      type
    });

    if (existingArticle) {
      return res.status(400).json({
        success: false,
        message: `Article already ${type}`
      });
    }

    // Create article
    const article = new Article({
      userId: req.user._id,
      storyId,
      title,
      url,
      type,
      score: score || 0,
      author: author || 'unknown',
      comments: comments || 0,
      tags: tags || [],
      notes: notes || ''
    });

    await article.save();

    res.status(201).json({
      success: true,
      message: `Article ${type} successfully`,
      data: { article }
    });

  } catch (error) {
    console.error('Save article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving article'
    });
  }
});

// Get saved articles
router.get('/saved', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'savedAt' } = req.query;
    const skip = (page - 1) * limit;

    const articles = await Article.find({
      userId: req.user._id,
      type: 'saved'
    })
    .sort({ [sort]: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v');

    const total = await Article.countDocuments({
      userId: req.user._id,
      type: 'saved'
    });

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get saved articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching saved articles'
    });
  }
});

// Get read-later articles
router.get('/read-later', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'savedAt' } = req.query;
    const skip = (page - 1) * limit;

    const articles = await Article.find({
      userId: req.user._id,
      type: 'read-later'
    })
    .sort({ [sort]: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v');

    const total = await Article.countDocuments({
      userId: req.user._id,
      type: 'read-later'
    });

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get read-later articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching read-later articles'
    });
  }
});

// Get all user articles
router.get('/all', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, sort = 'savedAt' } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (type && ['saved', 'read-later'].includes(type)) {
      filter.type = type;
    }

    const articles = await Article.find(filter)
      .sort({ [sort]: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Article.countDocuments(filter);

    res.json({
      success: true,
      data: {
        articles,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get all articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching articles'
    });
  }
});

// Update article (mark as read, add notes, etc.)
router.put('/:id', protect, async (req, res) => {
  try {
    const { readAt, notes, tags } = req.body;
    const articleId = req.params.id;

    const article = await Article.findOne({
      _id: articleId,
      userId: req.user._id
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    const updateData = {};
    if (readAt !== undefined) updateData.readAt = readAt;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;

    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      updateData,
      { new: true }
    ).select('-__v');

    res.json({
      success: true,
      message: 'Article updated successfully',
      data: { article: updatedArticle }
    });

  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating article'
    });
  }
});

// Delete article
router.delete('/:id', protect, async (req, res) => {
  try {
    const articleId = req.params.id;

    const article = await Article.findOneAndDelete({
      _id: articleId,
      userId: req.user._id
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting article'
    });
  }
});

// Check if article is saved
router.get('/check/:storyId', protect, async (req, res) => {
  try {
    const { storyId } = req.params;

    const savedArticle = await Article.findOne({
      userId: req.user._id,
      storyId,
      type: 'saved'
    });

    const readLaterArticle = await Article.findOne({
      userId: req.user._id,
      storyId,
      type: 'read-later'
    });

    res.json({
      success: true,
      data: {
        isSaved: !!savedArticle,
        isReadLater: !!readLaterArticle,
        savedArticle: savedArticle || null,
        readLaterArticle: readLaterArticle || null
      }
    });

  } catch (error) {
    console.error('Check article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking article status'
    });
  }
});

// @desc    Get saved articles
// @route   GET /api/articles/saved
// @access  Private
router.get('/saved', protect, async (req, res) => {
    try {
        const articles = await Article.find({ 
            userId: req.user.id, 
            type: 'saved' 
        }).sort({ savedAt: -1 });
        
        res.json({
            success: true,
            data: {
                articles,
                pagination: {
                    total: articles.length,
                    page: 1,
                    limit: 50
                }
            }
        });
    } catch (error) {
        console.error('Get saved articles error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// @desc    Get read-later articles
// @route   GET /api/articles/read-later
// @access  Private
router.get('/read-later', protect, async (req, res) => {
    try {
        const articles = await Article.find({ 
            userId: req.user.id, 
            type: 'read-later' 
        }).sort({ savedAt: -1 });
        
        res.json({
            success: true,
            data: {
                articles,
                pagination: {
                    total: articles.length,
                    page: 1,
                    limit: 50
                }
            }
        });
    } catch (error) {
        console.error('Get read-later articles error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

// @desc    Save an article (alias for POST /)
// @route   POST /api/articles/save
// @access  Private
router.post('/save', protect, async (req, res) => {
    const { storyId, title, url, author, score, comments, type } = req.body;

    if (!storyId || !title || !url || !type) {
        return res.status(400).json({ 
            success: false,
            message: 'Please provide storyId, title, url, and type' 
        });
    }

    try {
        const article = await Article.create({
            userId: req.user.id,
            storyId,
            title,
            url,
            by: author,
            score,
            comments,
            type
        });
        
        res.status(201).json({
            success: true,
            data: article
        });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return res.status(400).json({ 
                success: false,
                message: `Article already ${type} for this user.` 
            });
        }
        console.error('Save article error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error' 
        });
    }
});

module.exports = router;
