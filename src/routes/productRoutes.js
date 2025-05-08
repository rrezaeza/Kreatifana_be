const express = require('express');
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct, incrementDownload } = require('../controllers/productController');
const { getProductReviews, createReview } = require('../controllers/reviewController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', getProducts);

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', getProductById);

// @route   POST /api/products
// @desc    Create new product
// @access  Private
router.post('/', protect, createProduct);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id', protect, updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private
router.delete('/:id', protect, deleteProduct);

// @route   POST /api/products/:id/download
// @desc    Increment download count
// @access  Private
router.post('/:id/download', protect, incrementDownload);

// @route   GET /api/products/:productId/reviews
// @desc    Get reviews for a product
// @access  Public
router.get('/:productId/reviews', getProductReviews);

// @route   POST /api/products/:productId/reviews
// @desc    Create a review
// @access  Private
router.post('/:productId/reviews', protect, createReview);

module.exports = router;