const { body } = require('express-validator');

const initiateTransferValidators = [
  body('toPhone')
    .trim()
    .notEmpty()
    .withMessage('The new owner\'s phone number is required.')
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage('Enter a valid phone number.'),
];

const respondToTransferValidators = [
  body('action').isIn(['ACCEPT', 'REJECT', 'CANCEL']).withMessage('Invalid action.'),
];

module.exports = { initiateTransferValidators, respondToTransferValidators };
