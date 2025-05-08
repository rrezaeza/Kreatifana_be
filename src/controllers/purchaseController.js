const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * @desc    Get user's purchased products
 * @route   GET /api/purchases
 * @access  Private
 */
const getPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    
    const purchases = await prisma.purchase.findMany({
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
                reviews: true
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
    
    const totalPurchases = await prisma.purchase.count({
      where: {
        userId: req.user.id
      }
    });
    
    res.json({
      success: true,
      purchases,
      pagination: {
        page,
        limit,
        total: totalPurchases,
        pages: Math.ceil(totalPurchases / limit)
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
 * @desc    Create new purchase
 * @route   POST /api/purchases
 * @access  Private
 */
const createPurchase = async (req, res) => {
  const { productId, paymentId } = req.body;

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

    // Check if already purchased
    const existingPurchase = await prisma.purchase.findFirst({
      where: {
        productId,
        userId: req.user.id
      }
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: 'You have already purchased this product'
      });
    }

    // Create purchase
    const price = product.discountedPrice || product.price;
    const purchase = await prisma.purchase.create({
      data: {
        productId,
        userId: req.user.id,
        price,
        paymentId
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
      purchase
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
 * @desc    Check if user has purchased a product
 * @route   GET /api/purchases/:productId/check
 * @access  Private
 */
const checkPurchase = async (req, res) => {
  try {
    const purchase = await prisma.purchase.findFirst({
      where: {
        productId: req.params.productId,
        userId: req.user.id
      }
    });

    res.json({
      success: true,
      hasPurchased: !!purchase,
      purchase: purchase || null
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
 * @desc    Get all purchases (admin)
 * @route   GET /api/purchases/admin
 * @access  Private/Admin
 */
const getAllPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const purchases = await prisma.purchase.findMany({
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            discountedPrice: true,
            thumbnailUrl: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    const totalPurchases = await prisma.purchase.count();
    
    // Calculate total revenue
    const totalRevenue = await prisma.purchase.aggregate({
      _sum: {
        price: true
      }
    });
    
    res.json({
      success: true,
      purchases,
      totalRevenue: totalRevenue._sum.price || 0,
      pagination: {
        page,
        limit,
        total: totalPurchases,
        pages: Math.ceil(totalPurchases / limit)
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

module.exports = {
  getPurchases,
  createPurchase,
  checkPurchase,
  getAllPurchases
};