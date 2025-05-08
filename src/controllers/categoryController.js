const { PrismaClient } = require('@prisma/client');
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
          select: { products: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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
          select: { products: true }
        }
      }
    });

    if (category) {
      res.json({
        success: true,
        category
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Create new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
const createCategory = async (req, res) => {
  const { name, description, slug, image } = req.body;

  try {
    // Check if category exists
    const categoryExists = await prisma.category.findFirst({
      where: {
        OR: [
          { name },
          { slug }
        ]
      }
    });

    if (categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Category with that name or slug already exists'
      });
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name,
        description,
        slug,
        image
      }
    });

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
const updateCategory = async (req, res) => {
  const { name, description, slug, image } = req.body;

  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if the updated slug or name already exists in other categories
    if (slug && slug !== category.slug) {
      const slugExists = await prisma.category.findFirst({
        where: {
          slug,
          id: {
            not: req.params.id
          }
        }
      });

      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: 'Category with that slug already exists'
        });
      }
    }

    if (name && name !== category.name) {
      const nameExists = await prisma.category.findFirst({
        where: {
          name,
          id: {
            not: req.params.id
          }
        }
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: 'Category with that name already exists'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (slug) updateData.slug = slug;
    if (image !== undefined) updateData.image = image;

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      success: true,
      category: updatedCategory
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
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
          select: { products: true }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    if (category._count.products > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with products. Move or delete the products first.'
      });
    }

    await prisma.category.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Category removed'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};