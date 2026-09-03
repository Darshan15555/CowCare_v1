const { body } = require('express-validator');

const addCattleValidators = [
  body('name').trim().notEmpty().withMessage('Cattle name is required.').isLength({ max: 100 }),
  body('gender').isIn(['MALE', 'FEMALE']).withMessage('Gender must be MALE or FEMALE.'),
  body('breed').optional().trim().isLength({ max: 100 }),
  body('estimatedAgeYears').optional().isFloat({ min: 0, max: 40 }),
  body('color').optional().trim().isLength({ max: 100 }),
  body('identifyingMarks').optional().trim().isLength({ max: 500 }),
  body('stateCode').optional().trim().isLength({ max: 4 }),
];

const updateCattleValidators = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('status').optional().isIn(['HEALTHY', 'UNDER_OBSERVATION', 'CRITICAL', 'RECOVERING']),
  body('estimatedAgeYears').optional().isFloat({ min: 0, max: 40 }),
];

module.exports = { addCattleValidators, updateCattleValidators };
