/**
 * Usage: restrictTo('FARMER', 'ADMIN')
 * Must run after `protect` middleware (relies on req.user).
 */
const restrictTo = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    res.status(403);
    return next(new Error(`Access denied for role: ${req.user ? req.user.role : 'unknown'}`));
  }
  next();
};

module.exports = { restrictTo };
