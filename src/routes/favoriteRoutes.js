const express = require('express');
const { getFavorites, addFavorite, removeFavorite, checkFavorite } = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes in this router
router.use(protect);

// @route   GET /api/favorites
// @desc    Get user's favorite products
// @access  Private
router.get('/', getFavorites);

// @route   POST /api/favorites
// @desc    Add product to favorites
// @access  Private
router.post('/', addFavorite);

// @route   DELETE /api/favorites/:productId
// @desc    Remove product from favorites
// @access  Private
router.delete('/:productId', removeFavorite);

// @route   GET /api/favorites/:productId/check
// @desc    Check if a product is in user's favorites
// @access  Private
router.get('/:productId/check', checkFavorite);

module.exports = router;