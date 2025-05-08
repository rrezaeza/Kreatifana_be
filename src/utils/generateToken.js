const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for user authentication
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

module.exports = generateToken;