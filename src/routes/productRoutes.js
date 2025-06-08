// src/routes/productRoutes.js
const express = require("express");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  incrementDownload,
  getProductBySlug,
} = require("../controllers/productController");
const {
  getProductReviews,
  createReview,
} = require("../controllers/reviewController");
const { protect, admin } = require("../middleware/authMiddleware");

const multer = require('multer'); // <-- Import Multer
const path = require('path');     // <-- Import path

const router = express.Router();

// --- KONFIGURASI MULTER ---
// Menentukan bagaimana file akan disimpan di disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Tentukan folder tempat file akan disimpan.
    // path.join(__dirname, '../../uploads') akan mengarah ke folder 'uploads'
    // yang berada di root proyek backend Anda (sejajar dengan folder 'src').
    // PASTIKAN FOLDER 'uploads' INI SUDAH ADA DAN MEMILIKI IZIN TULIS.
    // Jika belum, Anda harus membuat folder ini secara manual: `mkdir uploads`
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    // Atur nama file yang unik untuk menghindari konflik.
    // Menggunakan timestamp + nama asli file.
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Inisialisasi Multer dengan konfigurasi penyimpanan
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Opsional: Batas ukuran file 10MB (sesuaikan jika perlu)
                                         // Jika file melebihi batas ini, Multer akan menghasilkan error `LIMIT_FILE_SIZE`.
  fileFilter: (req, file, cb) => {
    // Opsional: Filter jenis file yang diizinkan berdasarkan fieldname
    // Contoh: hanya izinkan gambar untuk 'thumbnail'
    if (file.fieldname === 'thumbnail') {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files (JPG, JPEG, PNG, GIF) are allowed for thumbnail!'), false);
      }
    }
    // Anda bisa menambahkan filter lain untuk 'file' (resource file) jika diperlukan
    cb(null, true); // Terima file
  }
});


// --- ROUTE YANG LEBIH SPESIFIK HARUS DATANG PERTAMA! ---

// @route   GET /api/products/slug/:slug
// @desc    Get single product by slug
// @access  Public
router.get("/slug/:slug", getProductBySlug);

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get("/:id", getProductById);

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get("/", getProducts);

// --- ROUTE-ROUTE DENGAN FILE UPLOAD DAN AUTENTIKASI ---

// @route   POST /api/products
// @desc    Create new product
// @access  Private (membutuhkan JWT)
router.post(
  "/",
  protect, // Middleware autentikasi
  // Multer middleware untuk menangani upload file
  // 'fields' digunakan karena ada dua input file dengan nama berbeda: 'thumbnail' dan 'file'
  upload.fields([
    { name: 'thumbnail', maxCount: 1 }, // Sesuai dengan `formData.append("thumbnail", ...)` di frontend
    { name: 'file', maxCount: 1 }       // Sesuai dengan `formData.append("file", ...)` di frontend
  ]),
  createProduct // Controller untuk membuat produk
);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private (membutuhkan JWT)
router.put(
  "/:id",
  protect, // Middleware autentikasi
  // Multer middleware juga diperlukan untuk update jika ada kemungkinan upload file baru
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'file', maxCount: 1 }
  ]),
  updateProduct // Controller untuk mengupdate produk
);

// --- ROUTE-ROUTE LAINNYA ---

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private
router.delete("/:id", protect, deleteProduct);

// @route   POST /api/products/:id/download
// @desc    Increment download count
// @access  Private
router.post("/:id/download", protect, incrementDownload);

// @route   GET /api/products/:productId/reviews
// @desc    Get reviews for a product
// @access  Public
router.get("/:productId/reviews", getProductReviews);

// @route   POST /api/products/:productId/reviews
// @desc    Create a review
// @access  Private
router.post("/:productId/reviews", protect, createReview);

module.exports = router;