const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/products
const getProducts = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip  = (page - 1) * limit;

    // build where
    const where = { published: req.query.published === 'false' ? false : true };
    if (req.query.category) where.categoryId = req.query.category;
    if (req.query.user)     where.userId     = req.query.user;
    if (req.query.search) {
      where.OR = [
        { title:       { contains: req.query.search, mode: 'insensitive' } },
        { description: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    if (req.query.minPrice || req.query.maxPrice) {
      where.price = {};
      if (req.query.minPrice) where.price.gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) where.price.lte = parseFloat(req.query.maxPrice);
    }

    // sort
    const sortField     = req.query.sortField     || 'createdAt';
    const sortDirection = req.query.sortDirection || 'desc';
    const orderBy = { [sortField]: sortDirection };

    // fetch
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          user:     { select: { id: true, name: true, avatar: true } },
          tags:     { select: { id: true, name: true } },
          _count:   { select: { reviews: true, favoritedBy: true, purchasedBy: true } },
        },
        skip,
        take: limit,
        orderBy
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        page, limit, total, pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        user:     { select: { id: true, name: true, avatar: true, bio: true } },
        tags:     { select: { id: true, name: true } },
        reviews:  {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' }
        },
        _count: { select: { reviews: true, favoritedBy: true, purchasedBy: true } }
      }
    });

    if (!product)
      return res.status(404).json({ success: false, message: 'Product not found' });

    // avg rating
    const avgRating = product.reviews.length
      ? product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length
      : 0;

    res.json({ success: true, product: { ...product, avgRating } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  const { title, description, price, thumbnailUrl, fileUrl, slug, categoryId, tags } = req.body;
  try {
    if (await prisma.product.findUnique({ where: { slug } }))
      return res.status(400).json({ success: false, message: 'Slug exists' });

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
        tags: tags?.length
          ? { connect: tags.map(id => ({ id })) }
          : undefined
      },
      include: {
        category: true,
        user:     { select: { id: true, name: true, avatar: true } },
        tags:     { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res) => {
  const { title, description, price, thumbnailUrl, fileUrl, slug, categoryId, tags } = req.body;
  try {
    const prod = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!prod) return res.status(404).json({ success: false, message: 'Not found' });
    if (prod.userId !== req.user.id && !req.user.isAdmin)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    if (slug && slug !== prod.slug) {
      if (await prisma.product.findFirst({ where: { slug, id: { not: prod.id } } }))
        return res.status(400).json({ success: false, message: 'Slug exists' });
    }

    // update
    const updated = await prisma.$transaction(async tx => {
      if (tags) {
        await tx.productsOnTags.deleteMany({ where: { productId: prod.id } });
        if (tags.length) {
          await tx.productsOnTags.createMany({
            data: tags.map(tagId => ({ productId: prod.id, tagId }))
          });
        }
      }
      return tx.product.update({
        where: { id: prod.id },
        data: {
          title, description, price, thumbnailUrl, fileUrl,
          slug, categoryId
        },
        include: {
          category: true,
          user:     { select: { id: true, name: true, avatar: true } },
          tags:     { select: { id: true, name: true } }
        }
      });
    });

    res.json({ success: true, product: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
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
