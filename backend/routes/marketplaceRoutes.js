const express = require('express');
const router = express.Router();
const {
  getMarketplaceCattle,
  getMarketplaceStats,
  getMarketplaceCowProfile,
  toggleFavoriteCow,
  getFavoriteCows,
  listCowForSale,
  updateSaleListing,
  removeCowFromSale,
} = require('../controllers/marketplaceController');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const {
  openForSaleValidators,
  updateSaleStatusValidators,
} = require('../validators/marketplaceValidators');
const upload = require('../middleware/upload');

// All marketplace routes require authentication
router.use(protect);

// Marketplace aggregations & statistics
router.get('/stats', getMarketplaceStats);

// User's favorited cattle listings
router.get('/favorites', getFavoriteCows);
router.post('/cows/:id/favorite', toggleFavoriteCow);

// Browse and filter marketplace cattle
router.get('/cows', getMarketplaceCattle);

// Detailed marketplace passport + verified medical timeline
router.get('/cows/:id', getMarketplaceCowProfile);

// Convenient alias endpoints for listing/updating cattle sale status
router.post('/cows/:id/sale', restrictTo('FARMER'), upload.array('photos', 10), openForSaleValidators, validate, listCowForSale);
router.patch('/cows/:id/sale', restrictTo('FARMER'), upload.array('photos', 10), updateSaleStatusValidators, validate, updateSaleListing);
router.delete('/cows/:id/sale', restrictTo('FARMER'), removeCowFromSale);

module.exports = router;
