const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Get category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategoryById = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (category) {
      res.json({
        success: true,
        category,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Create new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
const createCategory = async (req, res) => {
  const { name, slug } = req.body; // reminder error hanya name disini tadi makanya slug null

  try {
    // Cek duplikat
    const categoryExists = await prisma.category.findFirst({
      where: { name },
    });
    if (categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category with that name already exists",
      });
    }

    // Create hanya dengan name
    const category = await prisma.category.create({
      data: { name, slug }, // nah slug nya tambahin
    });

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
const updateCategory = async (req, res) => {
  const { name } = req.body; // hanya name

  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
    });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    // Cek duplikat name
    if (name && name !== category.name) {
      const nameExists = await prisma.category.findFirst({
        where: { name, id: { not: req.params.id } },
      });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: "Category with that name already exists",
        });
      }
    }

    // Update hanya name
    const updatedCategory = await prisma.category.update({
      where: { id: req.params.id },
      data: { name: name || category.name },
    });

    res.json({ success: true, category: updatedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
const deleteCategory = async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if category has products
    if (category._count.products > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with products. Move or delete the products first.",
      });
    }

    await prisma.category.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Category removed",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getProductsByCategorySlug = async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. Cari kategori berdasarkan slug
    const category = await prisma.category.findUnique({
      where: { slug },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kategori tidak ditemukan",
      });
    }

    // 2. Ambil semua produk dengan categoryId tersebut
    const products = await prisma.product.findMany({
      where: {
        categoryId: category.id,
      },
      include: {
        user: true,
        category: true,
        tags: true,
        reviews: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Gagal fetch produk by category slug:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getProductsByCategorySlug,
};
