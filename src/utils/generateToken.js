const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      isAdmin: user.isAdmin,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = generateToken;
