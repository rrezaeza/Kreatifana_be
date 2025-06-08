const express = require("express");
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get("/", getCategories);

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get("/:id", getCategoryById);

// Admin routes - protected
router.use(protect, admin);

// @route   POST /api/categories
// @desc    Create new category
// @access  Private/Admin
router.post("/", createCategory);

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private/Admin
router.put("/:id", updateCategory);

// @route   DELETE /api/categories/:id
// @desc    Delete category
// @access  Private/Admin
router.delete("/:id", deleteCategory);

module.exports = router;
