require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

const { protect } = require("./middleware/authMiddleware");
const { errorHandler } = require("./middleware/errorMiddleware");
const multer = require("multer");

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
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at: ${uploadsDir}`);
}

// 1) Global middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// =========================================================
// >>>>>>> KOREKSI PENTING DI SINI: Konfigurasi CORS <<<<<<<
const allowedOrigins = [
  "http://localhost:5174", // URL frontend lokal Anda (sesuaikan port jika berbeda)
  "https://kreatifana-stage1.vercel.app", // Domain Vercel Anda (tanpa trailing slash jika memungkinkan)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Izinkan permintaan tanpa origin (misalnya, dari Postman atau permintaan file lokal)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}.`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// =========================================================

// 2) Public routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);

// --- PENTING: Middleware untuk melayani file yang diupload ---
app.use("/uploads", express.static(uploadsDir));
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
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer Error:", err.code, err.message);
    let message = `File upload error: ${err.message}`;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File terlalu besar. Maksimum 10MB diizinkan.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Field tidak terduga untuk upload file: ${err.field}.`;
    }
    return res.status(400).json({ success: false, message: message });
  }
  errorHandler(err, req, res, next);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
