const express = require('express');
const router = express.Router();
const { getCattleAiSummary } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/cow-summary', getCattleAiSummary);

module.exports = router;
