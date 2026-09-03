const { validationResult } = require('express-validator');

/**
 * Runs after an array of express-validator checks. If any failed, responds
 * with 400 and a structured list of field-level errors instead of letting
 * bad input reach controllers/Mongoose (where errors are less specific).
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  res.status(400).json({
    success: false,
    message: 'Validation failed.',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};

module.exports = { validate };
