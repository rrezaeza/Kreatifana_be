const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs/promises"); // Untuk menghapus file (asynchronous)
const path = require("path"); // Untuk membangun path file

// Helper function untuk mendapatkan detail produk (mengurangi duplikasi kode)
const getProductDetails = async (whereClause, includeReviews = true) => {
  const product = await prisma.product.findUnique({
    where: whereClause,
    include: {
      category: true,
      user: { select: { id: true, name: true, avatar: true, bio: true } },
      tags: { select: { id: true, name: true } },
      features: {
        select: {
          id: true,
          text: true,
          description: true,
          iconUrl: true,
        },
      },
      reviews: includeReviews
        ? {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
          }
        : false,
      _count: {
        select: { reviews: true, favoritedBy: true, purchasedBy: true },
      },
    },
  });

  if (!product) return null;

  // Hitung rata-rata rating hanya jika reviews di-include
  const avgRating =
    includeReviews && product.reviews.length
      ? product.reviews.reduce((a, r) => a + r.rating, 0) /
        product.reviews.length
      : 0;

  return { ...product, avgRating };
};

// --- GET /api/products ---
const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // build where clause
    const where = {};

    // Filter published
    if (req.query.published !== undefined) {
      where.published = req.query.published === "true";
    } else if (!(req.user && req.user.isAdmin)) {
      where.published = true;
    }

    if (req.query.category) where.categoryId = req.query.category;
    if (req.query.user) where.userId = req.query.user;
    if (req.query.search) {
      where.OR = [
        { title: { contains: req.query.search, mode: "insensitive" } },
        { description: { contains: req.query.search, mode: "insensitive" } },
      ];
    }

    if (req.query.minPrice || req.query.maxPrice) {
      where.price = {};
      if (req.query.minPrice) where.price.gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) where.price.lte = parseFloat(req.query.maxPrice);
    }

    // sort
    const sortField = req.query.sortField || "createdAt";
    const sortDirection = req.query.sortDirection || "desc";
    const orderBy = { [sortField]: sortDirection };

    // fetch
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              username: true, // ✅ Tambahkan username di sini
            },
          },
          tags: { select: { id: true, name: true } },
          _count: {
            select: { reviews: true, favoritedBy: true, purchasedBy: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getProducts:", err);
    next(err);
  }
};

// --- GET /api/products/:id ---
const getProductById = async (req, res, next) => {
  try {
    const product = await getProductDetails({ id: req.params.id });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error("Error in getProductById:", err);
    next(err);
  }
};

// --- GET /api/products/slug/:slug ---
const getProductBySlug = async (req, res, next) => {
  try {
    const product = await getProductDetails({ slug: req.params.slug });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (err) {
    console.error("Error in getProductBySlug:", err);
    next(err);
  }
};

// --- POST /api/products (Membuat Produk Baru) ---
const createProduct = async (req, res, next) => {
  // Path dasar untuk folder uploads relatif dari root proyek
  const uploadsBasePath = path.join(__dirname, "../../uploads");

  try {
    const { title, description, price, slug, categoryId } = req.body;
    // Tags dari FormData mungkin datang sebagai string JSON atau array FormData (tags[])
    // Kita asumsikan `tags[]` dari FormData akan di-parse Express menjadi array.
    // Jika tags datang sebagai string JSON, Anda perlu JSON.parse(req.body.tags)
    const tags = Array.isArray(req.body["tags[]"]) ? req.body["tags[]"] : [];
    // Atau jika tags hanya dikirim sebagai 'tags' (string JSON):
    // const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    // Ambil URL/Path dari file yang diupload oleh Multer
    const thumbnailUrl =
      req.files && req.files.thumbnail && req.files.thumbnail[0]
        ? `/uploads/${req.files.thumbnail[0].filename}`
        : null;

    const fileUrl =
      req.files && req.files.file && req.files.file[0]
        ? `/uploads/${req.files.file[0].filename}`
        : null;

    // Validasi Input Wajib
    if (
      !title ||
      !description ||
      !price ||
      !slug ||
      !categoryId ||
      !thumbnailUrl
    ) {
      // Hapus file yang sudah terupload jika validasi gagal
      if (thumbnailUrl) {
        await fs
          .unlink(path.join(uploadsBasePath, path.basename(thumbnailUrl)))
          .catch((e) =>
            console.error(`Failed to delete partial thumbnail: ${e.message}`)
          );
      }
      if (fileUrl) {
        await fs
          .unlink(path.join(uploadsBasePath, path.basename(fileUrl)))
          .catch((e) =>
            console.error(`Failed to delete partial file: ${e.message}`)
          );
      }
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required product details, including a thumbnail.",
      });
    }

    // Validasi Slug Unik
    const existingProduct = await prisma.product.findUnique({
      where: { slug },
    });
    if (existingProduct) {
      // Hapus file yang sudah terupload jika validasi slug gagal
      if (thumbnailUrl) {
        await fs
          .unlink(path.join(uploadsBasePath, path.basename(thumbnailUrl)))
          .catch((e) =>
            console.error(`Failed to delete partial thumbnail: ${e.message}`)
          );
      }
      if (fileUrl) {
        await fs
          .unlink(path.join(uploadsBasePath, path.basename(fileUrl)))
          .catch((e) =>
            console.error(`Failed to delete partial file: ${e.message}`)
          );
      }
      return res.status(409).json({
        success: false,
        message:
          "Product with this slug already exists. Please choose a different one.",
      });
    }

    const product = await prisma.product.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        slug,
        thumbnailUrl: thumbnailUrl,
        fileUrl: fileUrl,
        category: { connect: { id: categoryId } },
        // *** INI ADALAH PERBAIKAN UTAMA UNTUK ERROR PRISMA SEBELUMNYA ***
        user: { connect: { id: req.user.id } }, // Ambil userId dari token yang diverifikasi
        tags: {
          connect: tags.map((id) => ({ id })), // Hubungkan ke tags yang sudah ada berdasarkan ID
        },
        // Tambahkan published = true secara default saat membuat
        published: true,
      },
      include: {
        category: true,
        user: { select: { id: true, name: true, avatar: true } },
        tags: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error("Error in createProduct:", err);
    // Jika ada error setelah file terupload tapi sebelum data masuk DB,
    // pertimbangkan untuk menghapus file yang baru terupload
    const thumbnailUrl =
      req.files && req.files.thumbnail && req.files.thumbnail[0]
        ? `/uploads/${req.files.thumbnail[0].filename}`
        : null;
    const fileUrl =
      req.files && req.files.file && req.files.file[0]
        ? `/uploads/${req.files.file[0].filename}`
        : null;

    if (thumbnailUrl) {
      await fs
        .unlink(path.join(uploadsBasePath, path.basename(thumbnailUrl)))
        .catch((e) =>
          console.error(`Failed to delete thumbnail after error: ${e.message}`)
        );
    }
    if (fileUrl) {
      await fs
        .unlink(path.join(uploadsBasePath, path.basename(fileUrl)))
        .catch((e) =>
          console.error(`Failed to delete file after error: ${e.message}`)
        );
    }
    next(err); // Teruskan error ke middleware penanganan error global
  }
};

// --- PUT /api/products/:id (Mengupdate Produk) ---
const updateProduct = async (req, res, next) => {
  const uploadsBasePath = path.join(__dirname, "../../uploads"); // Path dasar untuk uploads

  try {
    const { id } = req.params; // ID produk dari URL
    const { title, description, price, slug, categoryId, published } = req.body;
    const tags = Array.isArray(req.body["tags[]"]) ? req.body["tags[]"] : [];
    // Atau jika tags hanya dikirim sebagai 'tags' (string JSON):
    // const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

    let newThumbnailUrl = null;
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      newThumbnailUrl = `/uploads/${req.files.thumbnail[0].filename}`;
    }

    let newFileUrl = null;
    if (req.files && req.files.file && req.files.file[0]) {
      newFileUrl = `/uploads/${req.files.file[0].filename}`;
    }

    // Periksa Produk yang Sudah Ada
    const prod = await prisma.product.findUnique({
      where: { id },
      select: {
        userId: true,
        slug: true,
        thumbnailUrl: true,
        fileUrl: true,
        categoryId: true,
        price: true,
        description: true,
        title: true,
        published: true,
      },
    });

    if (!prod) {
      // Hapus file baru jika produk tidak ditemukan
      if (newThumbnailUrl)
        await fs
          .unlink(path.join(uploadsBasePath, path.basename(newThumbnailUrl)))
          .catch((e) => console.error(e));
      if (newFileUrl)
        await fs
          .unlink(path.join(uploadsBasePath, path.basename(newFileUrl)))
          .catch((e) => console.error(e));
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Validasi Otorisasi Pengguna
    if (prod.userId !== req.user.id && !req.user.isAdmin) {
      // Hapus file baru jika tidak diotorisasi
      if (newThumbnailUrl)
        await fs
          .unlink(path.join(uploadsBasePath, path.basename(newThumbnailUrl)))
          .catch((e) => console.error(e));
      if (newFileUrl)
        await fs
          .unlink(path.join(uploadsBasePath, path.basename(newFileUrl)))
          .catch((e) => console.error(e));
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this product",
      });
    }

    // Validasi Slug Unik Saat Update
    if (slug && slug !== prod.slug) {
      const slugConflictProduct = await prisma.product.findUnique({
        where: { slug },
      });
      if (slugConflictProduct && slugConflictProduct.id !== id) {
        // Hapus file baru jika ada konflik slug
        if (newThumbnailUrl)
          await fs
            .unlink(path.join(uploadsBasePath, path.basename(newThumbnailUrl)))
            .catch((e) => console.error(e));
        if (newFileUrl)
          await fs
            .unlink(path.join(uploadsBasePath, path.basename(newFileUrl)))
            .catch((e) => console.error(e));
        return res.status(409).json({
          success: false,
          message: "Product with this slug already exists.",
        });
      }
    }

    // Data yang akan diupdate
    const updateData = {
      title: title || prod.title,
      description: description || prod.description,
      price: price ? parseFloat(price) : prod.price,
      slug: slug || prod.slug,
      categoryId: categoryId || prod.categoryId,
      // Jika `published` diberikan di body, gunakan nilainya. Jika tidak, tetap pakai nilai lama.
      published: typeof published === "boolean" ? published : prod.published,
    };

    // Tambahkan URL file baru hanya jika ada yang diupload
    if (newThumbnailUrl) {
      updateData.thumbnailUrl = newThumbnailUrl;
    }
    if (newFileUrl) {
      updateData.fileUrl = newFileUrl;
    }

    // Lakukan Update Produk dalam Transaksi (untuk Tags dan potential file deletion)
    const updated = await prisma.$transaction(async (tx) => {
      // Hapus file lama jika ada file baru yang diupload
      if (newThumbnailUrl && prod.thumbnailUrl) {
        const oldThumbnailPath = path.join(
          uploadsBasePath,
          path.basename(prod.thumbnailUrl)
        );
        await fs
          .unlink(oldThumbnailPath)
          .catch((e) =>
            console.error(`Failed to delete old thumbnail: ${e.message}`)
          );
      }
      if (newFileUrl && prod.fileUrl) {
        const oldFilePath = path.join(
          uploadsBasePath,
          path.basename(prod.fileUrl)
        );
        await fs
          .unlink(oldFilePath)
          .catch((e) =>
            console.error(`Failed to delete old file: ${e.message}`)
          );
      }

      // Update data produk
      const updatedProductData = await tx.product.update({
        where: { id: prod.id },
        data: updateData,
      });

      // Update relasi tags: set (ganti semua tag yang ada dengan tag baru)
      // Hanya update tags jika array `tags` diberikan di request
      if (tags.length > 0 || req.body["tags[]"] !== undefined) {
        // Cek jika tags sengaja dikirim kosong
        await tx.product.update({
          where: { id: prod.id },
          data: {
            tags: {
              set: tags.map((tagId) => ({ id: tagId })),
            },
          },
        });
      }

      // Ambil kembali produk dengan semua relasi yang diperlukan untuk respons
      const finalProduct = await tx.product.findUnique({
        where: { id: prod.id },
        include: {
          category: true,
          user: { select: { id: true, name: true, avatar: true } },
          tags: { select: { id: true, name: true } },
        },
      });
      return finalProduct;
    });

    res.json({ success: true, product: updated });
  } catch (err) {
    console.error("Error updating product:", err);
    // Jika ada error setelah file baru terupload tapi update gagal, hapus file baru
    const newThumbnailUrl =
      req.files && req.files.thumbnail && req.files.thumbnail[0]
        ? `/uploads/${req.files.thumbnail[0].filename}`
        : null;
    const newFileUrl =
      req.files && req.files.file && req.files.file[0]
        ? `/uploads/${req.files.file[0].filename}`
        : null;

    if (newThumbnailUrl) {
      await fs
        .unlink(path.join(uploadsBasePath, path.basename(newThumbnailUrl)))
        .catch((e) =>
          console.error(
            `Failed to delete new thumbnail after error: ${e.message}`
          )
        );
    }
    if (newFileUrl) {
      await fs
        .unlink(path.join(uploadsBasePath, path.basename(newFileUrl)))
        .catch((e) =>
          console.error(`Failed to delete new file after error: ${e.message}`)
        );
    }

    next(err);
  }
};

// --- DELETE /api/products/:id ---
const deleteProduct = async (req, res, next) => {
  const uploadsBasePath = path.join(__dirname, "../../uploads"); // Path dasar untuk uploads

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { userId: true, thumbnailUrl: true, fileUrl: true }, // Select URLs for deletion
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check if user is authorized to delete this product
    // Asumsi req.user.isAdmin sudah di-set oleh middleware auth
    if (product.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this product",
      });
    }

    // Delete product from database
    await prisma.product.delete({
      where: { id: req.params.id },
    });

    // --- Hapus file dari disk setelah berhasil dihapus dari DB ---
    // Catatan: Jika ada error saat menghapus file, itu tidak akan mengganggu
    // keberhasilan operasi delete di database. Error akan dicatat saja.
    if (product.thumbnailUrl) {
      const thumbnailPath = path.join(
        uploadsBasePath,
        path.basename(product.thumbnailUrl)
      );
      await fs
        .unlink(thumbnailPath)
        .catch((e) =>
          console.error(
            `Failed to delete thumbnail ${thumbnailPath}: ${e.message}`
          )
        );
    }
    if (product.fileUrl) {
      const filePath = path.join(
        uploadsBasePath,
        path.basename(product.fileUrl)
      );
      await fs
        .unlink(filePath)
        .catch((e) =>
          console.error(`Failed to delete file ${filePath}: ${e.message}`)
        );
    }

    res.json({ success: true, message: "Product removed" });
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    next(error); // Teruskan error ke middleware penanganan error global
  }
};

// --- POST /api/products/:id/download ---
const incrementDownload = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { userId: true }, // Hanya perlu userId untuk cek otorisasi
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Check if user has purchased this product, is admin, or is the product owner
    const isOwner = product.userId === req.user.id;
    const isAdmin = req.user.isAdmin;

    const purchase = await prisma.purchase.findFirst({
      where: {
        productId: req.params.id,
        userId: req.user.id,
      },
    });

    if (!purchase && !isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You must purchase this product before downloading",
      });
    }

    // Increment download count
    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        downloads: {
          increment: 1,
        },
      },
      select: { downloads: true }, // Hanya kembalikan jumlah download
    });

    res.json({ success: true, downloads: updatedProduct.downloads });
  } catch (error) {
    console.error("Error in incrementDownload:", error);
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  incrementDownload,
};
