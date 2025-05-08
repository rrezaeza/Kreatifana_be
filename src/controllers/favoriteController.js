const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Get user's favorite products
 * @route   GET /api/favorites
 * @access  Private
 */
const getFavorites = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            },
            _count: {
              select: {
                reviews: true,
                favorites: true,
                purchases: true
              }
            }
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    const totalFavorites = await prisma.favorite.count({
      where: {
        userId: req.user.id
      }
    });
    
    res.json({
      success: true,
      favorites,
      pagination: {
        page,
        limit,
        total: totalFavorites,
        pages: Math.ceil(totalFavorites / limit)
      }
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
 * @desc    Add product to favorites
 * @route   POST /api/favorites
 * @access  Private
 */
const addFavorite = async (req, res) => {
  const { productId } = req.body;

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already favorited
    const existingFavorite = await prisma.favorite.findFirst({
      where: {
        productId,
        userId: req.user.id
      }
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Product already in favorites'
      });
    }

    // Add to favorites
    const favorite = await prisma.favorite.create({
      data: {
        productId,
        userId: req.user.id
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      favorite
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
 * @desc    Remove product from favorites
 * @route   DELETE /api/favorites/:productId
 * @access  Private
 */
const removeFavorite = async (req, res) => {
  try {
    const favorite = await prisma.favorite.findFirst({
      where: {
        productId: req.params.productId,
        userId: req.user.id
      }
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    await prisma.favorite.delete({
      where: {
        id: favorite.id
      }
    });

    res.json({
      success: true,
      message: 'Product removed from favorites'
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
 * @desc    Check if a product is in user's favorites
 * @route   GET /api/favorites/:productId/check
 * @access  Private
 */
const checkFavorite = async (req, res) => {
  try {
    const favorite = await prisma.favorite.findFirst({
      where: {
        productId: req.params.productId,
        userId: req.user.id
      }
    });

    res.json({
      success: true,
      isFavorite: !!favorite
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
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite
};