const express = require('express');
const router = express.Router();
const {
  completeVisit,
  recordVaccination,
  getCattleTimeline,
  getMedicalEventById,
  getUpcomingReminders,
} = require('../controllers/medicalController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const {
  completeVisitValidators,
  recordVaccinationValidators,
} = require('../validators/medicalValidators');
const upload = require('../middleware/upload');

router.use(protect);

router.get('/reminders', getUpcomingReminders);
router.post(
  '/complete/:requestId',
  restrictTo('VETERINARIAN'),
  upload.array('examPhotos', 5),
  completeVisitValidators,
  validate,
  completeVisit
);
router.post(
  '/vaccination/:cattleId',
  restrictTo('VETERINARIAN'),
  recordVaccinationValidators,
  validate,
  recordVaccination
);
router.get('/cattle/:cattleId/timeline', getCattleTimeline);
router.get('/:eventId', getMedicalEventById);

module.exports = router;
