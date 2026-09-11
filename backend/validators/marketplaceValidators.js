const { body, param } = require('express-validator');

const openForSaleValidators = [
  param('id').isMongoId().withMessage('Invalid cattle ID.'),
  body('askingPrice')
    .notEmpty()
    .withMessage('Asking price is required.')
    .isFloat({ min: 0 })
    .withMessage('Asking price must be a valid positive amount.'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters.'),
  body('contactPhone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage('Enter a valid contact phone number.'),
  body('location.address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 }),
  body('location.lat').optional().isFloat({ min: -90, max: 90 }),
  body('location.lng').optional().isFloat({ min: -180, max: 180 }),
];

const updateSaleStatusValidators = [
  param('id').isMongoId().withMessage('Invalid cattle ID.'),
  body('status')
    .notEmpty()
    .withMessage('Sale status is required.')
    .isIn(['NOT_FOR_SALE', 'OPEN_FOR_SALE', 'SALE_PENDING', 'SOLD', 'REMOVED_FROM_SALE'])
    .withMessage('Invalid sale status.'),
  body('askingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Asking price must be a valid positive amount.'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters.'),
];

module.exports = {
  openForSaleValidators,
  updateSaleStatusValidators,
};
