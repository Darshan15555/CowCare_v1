const { param, query } = require('express-validator');

const vetIdValidators = [param('vetId').isMongoId().withMessage('Invalid veterinarian ID.')];
const vetDirectoryValidators = [
  query('specialization').optional().trim().isLength({ max: 100 }),
  query('onDutyOnly').optional().isBoolean().withMessage('onDutyOnly must be true or false.'),
];

module.exports = { vetIdValidators, vetDirectoryValidators };
