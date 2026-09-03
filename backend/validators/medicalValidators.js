const { body } = require('express-validator');

const parseJsonIfString = (field) =>
  body(field).customSanitizer((value) => {
    if (typeof value === 'string' && value.trim() !== '') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  });

const completeVisitValidators = [
  body('clinicalAssessment')
    .trim()
    .notEmpty()
    .withMessage('Clinical assessment is required.')
    .isLength({ max: 2000 }),
  body('treatmentPerformed')
    .trim()
    .notEmpty()
    .withMessage('Treatment performed is required.')
    .isLength({ max: 2000 }),
  body('observedSymptoms').optional().trim().isLength({ max: 1000 }),
  body('physicalFindings').optional().trim().isLength({ max: 1000 }),
  body('examinationNotes').optional().trim().isLength({ max: 1000 }),
  body('additionalNotes').optional().trim().isLength({ max: 1000 }),
  body('followUpDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid follow-up date.'),
  parseJsonIfString('vitals'),
  parseJsonIfString('medicines'),
];

const recordVaccinationValidators = [
  body('vaccineName').trim().notEmpty().withMessage('Vaccine name is required.').isLength({ max: 150 }),
  body('nextDueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid due date.'),
];

module.exports = { completeVisitValidators, recordVaccinationValidators };
