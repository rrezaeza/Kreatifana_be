const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where = {};

    // Filter by published status (default to true)
    where.published = req.query.published === "false" ? false : true;

    // Filter by featured

    // Filter by category
    if (req.query.category) {
      where.categoryId = req.query.category;
    }

    // Filter by user
    if (req.query.user) {
      where.userId = req.query.user;
    }

    // Filter by tags
    if (req.query.tag) {
      where.tags = {
        some: {
          tagId: req.query.tag,
        },
      };
    }

    // Search by title or description
    if (req.query.search) {
      where.OR = [
        { title: { contains: req.query.search, mode: "insensitive" } },
        { description: { contains: req.query.search, mode: "insensitive" } },
      ];
    }

    // Price range
    if (req.query.minPrice) {
      where.price = {
        ...where.price,
        gte: parseFloat(req.query.minPrice),
      };
    }

    if (req.query.maxPrice) {
      where.price = {
        ...where.price,
        lte: parseFloat(req.query.maxPrice),
      };
    }

    // Get sort field and direction
    let orderBy = {};
    const sortField = req.query.sortField || "createdAt";
    const sortDirection = req.query.sortDirection || "desc";
    orderBy[sortField] = sortDirection;

    // Get products
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
            purchases: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    });

    // Get total count for pagination
    const totalProducts = await prisma.product.count({ where });

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        total: totalProducts,
        pages: Math.ceil(totalProducts / limit),
      },
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
 * @desc    Get product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            reviews: true,
            favorites: true,
            purchases: true,
          },
        },
      },
    });

    if (product) {
      // Calculate average rating
      let avgRating = 0;
      if (product.reviews.length > 0) {
        avgRating =
          product.reviews.reduce((acc, review) => acc + review.rating, 0) /
          product.reviews.length;
      }

      res.json({
        success: true,
        product: {
          ...product,
          avgRating,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Product not found",
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
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private
 */
const createProduct = async (req, res) => {
  const {
    title,
    description,
    price,
    thumbnailUrl,
    fileUrl,
    slug,
    categoryId,
    tags,
  } = req.body;

  try {
    // Check if product with that slug exists
    const productExists = await prisma.product.findUnique({
      where: { slug },
    });

    if (productExists) {
      return res.status(400).json({
        success: false,
        message: "Product with that slug already exists",
      });
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price,
        thumbnailUrl,
        fileUrl,
        slug,
        categoryId,
        userId: req.user.id,
        tags: tags
          ? {
              create: tags.map((tagId) => ({
                tag: {
                  connect: { id: tagId },
                },
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      product,
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
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private
 */
const updateProduct = async (req, res) => {
  const {
    title,
    description,
    price,
    thumbnailUrl,
    fileUrl,
    slug,
    categoryId,
    tags,
  } = req.body;

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        tags: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user is authorized to update this product
    if (product.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this product",
      });
    }

    // Check if new slug already exists for a different product
    if (slug && slug !== product.slug) {
      const slugExists = await prisma.product.findFirst({
        where: {
          slug,
          id: {
            not: req.params.id,
          },
        },
      });

      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: "Product with that slug already exists",
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (thumbnailUrl) updateData.thumbnailUrl = thumbnailUrl;
    if (fileUrl) updateData.fileUrl = fileUrl;
    if (slug) updateData.slug = slug;
    if (published !== undefined) updateData.published = published;
    if (categoryId) updateData.categoryId = categoryId;

    // Update product tags if provided
    let tagsUpdateOperation;
    if (tags) {
      // Delete existing product-tag relationships
      tagsUpdateOperation = prisma.productsOnTags.deleteMany({
        where: {
          productId: req.params.id,
        },
      });
    }

    // Update product
    const updatedProduct = await prisma.$transaction(async (prisma) => {
      // Execute tags deletion if needed
      if (tagsUpdateOperation) {
        await tagsUpdateOperation;

        // Create new product-tag relationships
        if (tags.length > 0) {
          await prisma.productsOnTags.createMany({
            data: tags.map((tagId) => ({
              productId: req.params.id,
              tagId,
            })),
          });
        }
      }

      // Update the product
      return prisma.product.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          category: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });
    });

    res.json({
      success: true,
      product: updatedProduct,
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
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private
 */
const deleteProduct = async (req, res) => {
  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user is authorized to delete this product
    if (product.userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this product",
      });
    }

    // Delete product (Cascade will handle related records)
    await prisma.product.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: "Product removed",
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
 * @desc    Increment download count
 * @route   POST /api/products/:id/download
 * @access  Private
 */
const incrementDownload = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if user has purchased this product
    const purchase = await prisma.purchase.findFirst({
      where: {
        productId: req.params.id,
        userId: req.user.id,
      },
    });

    if (!purchase && !req.user.isAdmin && product.userId !== req.user.id) {
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
    });

    res.json({
      success: true,
      downloads: updatedProduct.downloads,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  incrementDownload,
};
