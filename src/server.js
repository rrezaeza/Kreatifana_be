require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require('path');
const fs = require('fs'); // Import fs for checking directory existence

const { protect } = require("./middleware/authMiddleware");
const { errorHandler } = require("./middleware/errorMiddleware");
const multer = require('multer'); // Diperlukan untuk MulterError

// Import Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const tagRoutes = require("./routes/tagRoutes");
const productRoutes = require("./routes/productRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Pastikan folder 'uploads' ada
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory at: ${uploadsDir}`);
}

// 1) Global middleware
app.use(
    cors({
        origin: "http://localhost:5173", // Sesuaikan dengan URL frontend Anda
        credentials: true,
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json()); // Untuk parsing body JSON
app.use(express.urlencoded({ extended: true })); // Untuk parsing URL-encoded body, penting untuk Multer juga
app.use(morgan("dev"));

// 2) Public routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);

// --- PENTING: Middleware untuk melayani file yang diupload ---
// Ini akan membuat file di folder `uploads` bisa diakses melalui URL `/uploads/*`
// Path ini diasumsikan folder `uploads` berada di root proyek (sejajar dengan `src`).
app.use('/uploads', express.static(uploadsDir));
console.log(`Serving static files from: ${uploadsDir} at /uploads URL`);


// 3) Product routes (dengan autentikasi diterapkan di productRoutes.js)
app.use("/api/products", productRoutes);

// 4) Protected routes (Hanya route yang benar-benar butuh JWT)
app.use("/api/users", protect, userRoutes);
app.use("/api/reviews", protect, reviewRoutes);
app.use("/api/favorites", protect, favoriteRoutes);
app.use("/api/purchases", protect, purchaseRoutes);

// 5) Base healthcheck
app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Digital Marketplace API" });
});

// 6) Error handler (harus paling akhir setelah semua rute)
// --- Penanganan Error Multer Spesifik ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer Error:', err.code, err.message);
        // Anda bisa memberikan pesan yang lebih user-friendly tergantung pada err.code
        let message = `File upload error: ${err.message}`;
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'File too large. Maximum 10MB allowed.';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = `Unexpected field for file upload: ${err.field}.`;
        }
        return res.status(400).json({ success: false, message: message });
    }
    // Lanjutkan ke error handler umum jika bukan error Multer
    errorHandler(err, req, res, next);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});