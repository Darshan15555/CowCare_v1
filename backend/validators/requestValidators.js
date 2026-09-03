const { body } = require('express-validator');

// `location` arrives as a JSON string when the request is multipart/form-data
// (it travels alongside file uploads). This custom validator parses it first
// so the underlying lat/lng/source checks can run against real values.
const parseLocationIfString = body('location').customSanitizer((value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
});

const createRequestValidators = [
  body('cattleId').notEmpty().withMessage('cattleId is required.').isMongoId().withMessage('Invalid cattleId.'),
  body('priority').isIn(['EMERGENCY', 'URGENT', 'ROUTINE']).withMessage('Invalid priority.'),
  body('problemDescription')
    .trim()
    .notEmpty()
    .withMessage('Problem description is required.')
    .isLength({ max: 1000 })
    .withMessage('Problem description is too long.'),
  parseLocationIfString,
  body('location').notEmpty().withMessage('Location is required.'),
  body('location.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude.'),
  body('location.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude.'),
  body('preferredDate').isISO8601().withMessage('Invalid preferred date.'),
  body('preferredTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Preferred time must be in HH:MM format.'),
];

const updateStatusValidators = [
  body('status')
    .isIn([
      'ACCEPTED',
      'REJECTED',
      'ON_THE_WAY',
      'ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ])
    .withMessage('Invalid status value.'),
  body('note').optional().trim().isLength({ max: 500 }),
  body('rejectionReason').optional().trim().isLength({ max: 500 }),
  body('cancellationReason').optional().trim().isLength({ max: 500 }),
];

const submitRatingValidators = [
  body('stars').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5 stars.'),
  body('comment').optional().trim().isLength({ max: 500 }),
];

module.exports = { createRequestValidators, updateStatusValidators, submitRatingValidators };
