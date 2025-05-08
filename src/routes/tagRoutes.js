const express = require('express');
const { getTags, getTagById, createTag, updateTag, deleteTag } = require('../controllers/tagController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/tags
// @desc    Get all tags
// @access  Public
router.get('/', getTags);

// @route   GET /api/tags/:id
// @desc    Get tag by ID
// @access  Public
router.get('/:id', getTagById);

// Admin routes - protected
router.use(protect, admin);

// @route   POST /api/tags
// @desc    Create new tag
// @access  Private/Admin
router.post('/', createTag);

// @route   PUT /api/tags/:id
// @desc    Update tag
// @access  Private/Admin
router.put('/:id', updateTag);

// @route   DELETE /api/tags/:id
// @desc    Delete tag
// @access  Private/Admin
router.delete('/:id', deleteTag);

module.exports = router;