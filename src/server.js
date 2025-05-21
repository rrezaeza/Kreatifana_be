// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { protect } = require("./middleware/authMiddleware");
const { errorHandler } = require("./middleware/errorMiddleware");

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

// 1) Global middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(morgan("dev"));

// 2) Public routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);

// 3) Protected routes
// semua /api/users, /api/products, /api/reviews, /api/favorites, /api/purchases
// butuh JWT => pakai middleware protect
app.use("/api/users", protect, userRoutes);
app.use("/api/products", protect, productRoutes);
app.use("/api/reviews", protect, reviewRoutes);
app.use("/api/favorites", protect, favoriteRoutes);
app.use("/api/purchases", protect, purchaseRoutes);

// 4) Base healthcheck
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Digital Marketplace API" });
});

// 5) Error handler (harus paling akhir)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
