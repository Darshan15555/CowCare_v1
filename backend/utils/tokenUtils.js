const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateAccessToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
  });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  });

// Refresh tokens are stored hashed (never plaintext) so a DB leak doesn't
// let an attacker reuse sessions directly.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = { generateAccessToken, generateRefreshToken, hashToken };
