const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

/**
 * Verifies the access token from the Authorization header (Bearer scheme).
 * Attaches the authenticated user document (minus sensitive fields) to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    res.status(401);
    if (err.name === 'TokenExpiredError') {
      throw new Error('Access token expired.');
    }
    throw new Error('Invalid access token.');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('User no longer exists or is inactive.');
  }

  req.user = user;
  next();
});

module.exports = { protect };
