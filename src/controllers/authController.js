const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");
const generateToken = require("../utils/generateToken");

const prisma = new PrismaClient();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, username, password, name } = req.body;

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username,
      },
    });

    if (user) {
      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
          token: generateToken(user), // ⬅️ Gunakan user, bukan hanya ID
        },
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
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        password: true,
        username: true,
      },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = generateToken(user); // ⬅️ Gunakan user lengkap

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          username: user.username,
        },
        token,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
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
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userProfile = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio || "",
      avatarUrl: user.avatar || "",
      followers: 0,
      following: 0,
      location: "",
      website: "",
      products: [],
    };

    res.json({ user: userProfile });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  const { name, email, bio, avatar, password } = req.body;

  try {
    const userToUpdate = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
};
