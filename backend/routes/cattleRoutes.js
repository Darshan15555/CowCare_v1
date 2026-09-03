const express = require('express');
const router = express.Router();
const {
  addCattle,
  getMyCattle,
  getCattleProfile,
  scanCattleQr,
  updateCattle,
} = require('../controllers/cattleController');
const {
  initiateTransfer,
  getMyTransfers,
  respondToTransfer,
} = require('../controllers/cattleTransferController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const { addCattleValidators, updateCattleValidators } = require('../validators/cattleValidators');
const {
  initiateTransferValidators,
  respondToTransferValidators,
} = require('../validators/cattleTransferValidators');
const upload = require('../middleware/upload');

router.use(protect);

router.post('/', restrictTo('FARMER'), upload.single('photo'), addCattleValidators, validate, addCattle);
router.get('/mine', restrictTo('FARMER'), getMyCattle);
router.get('/scan/:cattleId', restrictTo('VETERINARIAN', 'ADMIN'), scanCattleQr);

// Transfer routes — /transfers must be registered before the generic /:id
// route below, or Express would match "transfers" as an :id value.
router.get('/transfers', restrictTo('FARMER'), getMyTransfers);
router.post('/:id/transfer', restrictTo('FARMER'), initiateTransferValidators, validate, initiateTransfer);
router.patch(
  '/transfers/:transferId',
  restrictTo('FARMER'),
  respondToTransferValidators,
  validate,
  respondToTransfer
);

router.get('/:id', getCattleProfile);
router.patch(
  '/:id',
  restrictTo('FARMER', 'ADMIN'),
  upload.single('photo'),
  updateCattleValidators,
  validate,
  updateCattle
);

module.exports = router;
