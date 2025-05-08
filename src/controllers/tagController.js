const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Get all tags
 * @route   GET /api/tags
 * @access  Public
 */
const getTags = async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
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
      tags
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
 * @desc    Get tag by ID
 * @route   GET /api/tags/:id
 * @access  Public
 */
const getTagById = async (req, res) => {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (tag) {
      res.json({
        success: true,
        tag
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Tag not found'
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
 * @desc    Create new tag
 * @route   POST /api/tags
 * @access  Private/Admin
 */
const createTag = async (req, res) => {
  const { name, slug } = req.body;

  try {
    // Check if tag exists
    const tagExists = await prisma.tag.findFirst({
      where: {
        OR: [
          { name },
          { slug }
        ]
      }
    });

    if (tagExists) {
      return res.status(400).json({
        success: false,
        message: 'Tag with that name or slug already exists'
      });
    }

    // Create tag
    const tag = await prisma.tag.create({
      data: {
        name,
        slug
      }
    });

    res.status(201).json({
      success: true,
      tag
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
 * @desc    Update tag
 * @route   PUT /api/tags/:id
 * @access  Private/Admin
 */
const updateTag = async (req, res) => {
  const { name, slug } = req.body;

  try {
    const tag = await prisma.tag.findUnique({
      where: { id: req.params.id }
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Check if the updated slug or name already exists in other tags
    if (slug && slug !== tag.slug) {
      const slugExists = await prisma.tag.findFirst({
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
          message: 'Tag with that slug already exists'
        });
      }
    }

    if (name && name !== tag.name) {
      const nameExists = await prisma.tag.findFirst({
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
          message: 'Tag with that name already exists'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;

    // Update tag
    const updatedTag = await prisma.tag.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      success: true,
      tag: updatedTag
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
 * @desc    Delete tag
 * @route   DELETE /api/tags/:id
 * @access  Private/Admin
 */
const deleteTag = async (req, res) => {
  try {
    const tag = await prisma.tag.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found'
      });
    }

    // Delete all product-tag relationships first
    if (tag._count.products > 0) {
      await prisma.productsOnTags.deleteMany({
        where: {
          tagId: req.params.id
        }
      });
    }

    // Delete the tag
    await prisma.tag.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Tag removed'
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
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag
};