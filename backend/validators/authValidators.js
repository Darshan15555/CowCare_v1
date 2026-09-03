const { body } = require('express-validator');

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required.')
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage('Enter a valid phone number.'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email address.'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['FARMER', 'VETERINARIAN']).withMessage('Role must be FARMER or VETERINARIAN.'),
  body('farmName').optional().trim().isLength({ max: 150 }),
  body('specialization').optional().trim().isLength({ max: 150 }),
  body('licenseNumber').optional().trim().isLength({ max: 100 }),
  body('defaultLocation.lat').optional().isFloat({ min: -90, max: 90 }),
  body('defaultLocation.lng').optional().isFloat({ min: -180, max: 180 }),
];

const loginValidators = [
  body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const updateMeValidators = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email address.'),
  body('defaultLocation.lat').optional().isFloat({ min: -90, max: 90 }),
  body('defaultLocation.lng').optional().isFloat({ min: -180, max: 180 }),
  body('yearsOfExperience').optional().isInt({ min: 0, max: 80 }),
  body('serviceAreaRadiusKm').optional().isFloat({ min: 1, max: 500 }),
  body('isAvailable').optional().isBoolean(),
  body('acceptsEmergencyOverride').optional().isBoolean(),
  body('weeklySchedule')
    .optional()
    .isArray({ max: 7 })
    .withMessage('weeklySchedule must be an array of up to 7 day entries.'),
  body('weeklySchedule.*.dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('dayOfWeek must be 0-6.'),
  body('weeklySchedule.*.isWorking').optional().isBoolean(),
  body('weeklySchedule.*.startTime')
    .optional()
    .matches(TIME_PATTERN)
    .withMessage('startTime must be in HH:MM format.'),
  body('weeklySchedule.*.endTime')
    .optional()
    .matches(TIME_PATTERN)
    .withMessage('endTime must be in HH:MM format.'),
];

module.exports = { registerValidators, loginValidators, updateMeValidators };
