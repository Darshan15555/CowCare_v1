const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  submitRating,
  getVetRatingSummary,
} = require('../controllers/requestController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const {
  createRequestValidators,
  updateStatusValidators,
  submitRatingValidators,
} = require('../validators/requestValidators');
const upload = require('../middleware/upload');

router.use(protect);

router.post(
  '/',
  restrictTo('FARMER'),
  upload.fields([
    { name: 'photos', maxCount: 5 },
    { name: 'voiceNote', maxCount: 1 },
  ]),
  createRequestValidators,
  validate,
  createRequest
);
router.get('/vet-rating/:vetId', getVetRatingSummary);
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.patch('/:id/status', updateStatusValidators, validate, updateRequestStatus);
router.post('/:id/rating', restrictTo('FARMER'), submitRatingValidators, validate, submitRating);

module.exports = router;
