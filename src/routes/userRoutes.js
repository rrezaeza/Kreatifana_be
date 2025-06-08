// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUserById, // <-- Ini yang akan kita pisahkan
    createUser,
    updateUser,
    deleteUser,
    getLoggedInUserProfile // <-- Tambahkan ini jika kamu punya endpoint untuk profil user yang login
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// Rute untuk user yang sudah login (profil diri sendiri)
// Biasanya ini endpoint terpisah atau ditangani di AuthRoutes,
// tapi jika ada di sini, pastikan tidak terhalang middleware admin
router.get('/profile', protect, getLoggedInUserProfile); // Contoh rute untuk profil user yang sedang login

// @route   GET /api/users/:id
// @desc    Get user by ID (ini bisa diakses oleh siapa saja yang login, bukan hanya admin)
// @access  Private (hanya yang terautentikasi)
router.get('/:id', protect, getUserById); // <-- Pindahkan middleware 'admin' dari sini

// --- Rute-rute berikut ini HANYA untuk ADMIN ---
// Jika ada rute yang memang khusus admin, baru terapkan middleware 'admin' di situ.
// ATAU, jika mayoritas memang admin, bisa pakai router.use(protect, admin) di router terpisah.
// Untuk kasus ini, kita terapkan per rute agar lebih fleksibel.

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', protect, admin, getUsers); // <-- Tambahkan 'admin' di sini

// @route   POST /api/users
// @desc    Create new user (biasanya registrasi bukan di sini, tapi jika ini admin create, tambahkan admin)
// @access  Private/Admin
router.post('/', protect, admin, createUser); // <-- Tambahkan 'admin' di sini

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/:id', protect, admin, updateUser); // <-- Tambahkan 'admin' di sini

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', protect, admin, deleteUser); // <-- Tambahkan 'admin' di sini

module.exports = router;