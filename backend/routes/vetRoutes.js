const express = require('express');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const { listVets, getFavoriteVets, favoriteVet, unfavoriteVet } = require('../controllers/vetController');
const { vetIdValidators, vetDirectoryValidators } = require('../validators/vetValidators');

const router = express.Router();
router.use(protect, restrictTo('FARMER'));
router.get('/', vetDirectoryValidators, validate, listVets);
router.get('/favorites', getFavoriteVets);
router.post('/:vetId/favorite', vetIdValidators, validate, favoriteVet);
router.delete('/:vetId/favorite', vetIdValidators, validate, unfavoriteVet);
module.exports = router;
