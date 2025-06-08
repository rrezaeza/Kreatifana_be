const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
        },
      });

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      // --- UBAH BAGIAN INI ---
      console.error("Auth middleware error:", error.name, error.message);
      if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ message: "Not authorized, token has expired" });
      } else if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ message: `Not authorized, token invalid: ${error.message}` });
      } else {
          return res.status(401).json({ message: "Not authorized, token verification failed" });
      }
      // --- AKHIR UBAH ---
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ message: "Not authorized as admin" });
  }
};

module.exports = { protect, admin };
