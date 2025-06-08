// src/controllers/userController.js
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Fungsi getUsers tetap sama
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            reviews: true,
            favoriteProducts: true,
            followedBy: true,
            following: true,
            purchasedProducts: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalUsers = await prisma.user.count();
    const formattedUsers = users.map((user) => ({
      ...user,
      followers: user._count.followedBy,
      following: user._count.following,
      _count: undefined,
    }));

    res.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error("Error in getUsers:", error);
    next(error);
  }
};

/**
 * @desc    Get user by ID or Username
 * @route   GET /api/users/:identifier
 * @access  Private
 */
const getUserById = async (req, res, next) => {
  try {
    // Asumsi req.params.id sekarang bisa jadi ID (UUID) atau username
    // Kita coba cari berdasarkan ID dulu, jika tidak ketemu, coba username
    let user;
    // Coba cari berdasarkan ID (jika identifier adalah UUID)
    // Cek apakah string req.params.id terlihat seperti UUID
    const isUUID =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        req.params.id
      );

    if (isUUID) {
      user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          bio: true,
          avatar: true,
          isAdmin: true,
          location: true,
          portfolio: true,
          createdAt: true,
          _count: {
            select: {
              followedBy: true,
              following: true,
            },
          },
          products: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              description: true,
              slug: true,
              price: true,
              category: { select: { name: true } },
            },
          },
        },
      });
    }

    // Jika tidak ditemukan berdasarkan ID atau jika identifier bukan UUID, coba cari berdasarkan username
    if (!user) {
      user = await prisma.user.findUnique({
        where: { username: req.params.id }, // <-- UBAH KE username
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          bio: true,
          avatar: true,
          isAdmin: true,
          location: true,
          portfolio: true,
          createdAt: true,
          _count: {
            select: {
              followedBy: true,
              following: true,
            },
          },
          products: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              description: true,
              slug: true,
              price: true,
              category: { select: { name: true } },
            },
          },
        },
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const formattedUser = {
      ...user,
      followers: user._count.followedBy,
      following: user._count.following,
      _count: undefined,
    };

    res.json({
      success: true,
      user: formattedUser,
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    next(error);
  }
};

// Fungsi createUser tetap sama
const createUser = async (req, res, next) => {
  const {
    name,
    email,
    password,
    bio,
    avatar,
    isAdmin,
    username,
    location,
    portfolio,
  } = req.body; // Tambahkan portfolio

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists)
      return res
        .status(400)
        .json({
          success: false,
          message: "User with this email already exists",
        });

    const usernameExists = await prisma.user.findUnique({
      where: { username },
    });
    if (usernameExists)
      return res
        .status(400)
        .json({
          success: false,
          message: "User with this username already exists",
        });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        bio,
        avatar,
        isAdmin: isAdmin || false,
        location,
        portfolio, // <-- TAMBAHKAN
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        isAdmin: true,
        location: true,
        portfolio: true, // <-- TAMBAHKAN
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error("Error in createUser:", error);
    if (error.code === "P2002") {
      let field = "Unknown field";
      if (error.meta.target)
        field = Array.isArray(error.meta.target)
          ? error.meta.target.join(", ")
          : error.meta.target;
      return res
        .status(400)
        .json({
          success: false,
          message: `Duplicate entry for ${field}. Please use a different one.`,
        });
    }
    next(error);
  }
};

// Fungsi updateUser (ubah 'website' jadi 'portfolio')
const updateUser = async (req, res, next) => {
  const {
    name,
    email,
    bio,
    avatar,
    isAdmin,
    password,
    username,
    location,
    portfolio,
  } = req.body; // Ubah 'website' jadi 'portfolio'

  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    if (location !== undefined) updateData.location = location;
    if (portfolio !== undefined) updateData.portfolio = portfolio; // <-- DIUBAH DARI 'website'

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    if (email && email !== user.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists && emailExists.id !== user.id)
        return res
          .status(400)
          .json({ success: false, message: "Email already in use" });
    }
    if (username && username !== user.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username },
      });
      if (usernameExists && usernameExists.id !== user.id)
        return res
          .status(400)
          .json({ success: false, message: "Username already in use" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        isAdmin: true,
        location: true,
        portfolio: true, // <-- DIUBAH DARI 'website'
        createdAt: true,
      },
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error in updateUser:", error);
    next(error);
  }
};

// Fungsi deleteUser tetap sama
const deleteUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "User removed" });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    next(error);
  }
};

// Fungsi getLoggedInUserProfile (ubah 'website' jadi 'portfolio')
const getLoggedInUserProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        avatar: true,
        location: true,
        portfolio: true, // <-- DIUBAH DARI 'website'
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            followedBy: true,
            following: true,
          },
        },
        products: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            description: true,
            slug: true,
            price: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Logged-in user profile not found." });

    const formattedUser = {
      ...user,
      followers: user._count.followedBy,
      following: user._count.following,
    };
    delete formattedUser._count;

    res.json({ success: true, user: formattedUser });
  } catch (error) {
    console.error("Error fetching logged-in user profile:", error);
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getLoggedInUserProfile,
};
