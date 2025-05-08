const express = require('express');
const { getPurchases, createPurchase, checkPurchase, getAllPurchases } = require('../controllers/purchaseController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all routes in this router
router.use(protect);

// @route   GET /api/purchases
// @desc    Get user's purchased products
// @access  Private
router.get('/', getPurchases);

// @route   POST /api/purchases
// @desc    Create new purchase
// @access  Private
router.post('/', createPurchase);

// @route   GET /api/purchases/:productId/check
// @desc    Check if user has purchased a product
// @access  Private
router.get('/:productId/check', checkPurchase);

// Admin routes
// @route   GET /api/purchases/admin
// @desc    Get all purchases (admin)
// @access  Private/Admin
router.get('/admin', admin, getAllPurchases);

module.exports = router;