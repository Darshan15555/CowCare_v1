const express = require('express');
const router = express.Router();
const { aiChat, getCattleAiSummary } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Primary Conversational Chat endpoint
router.post('/chat', aiChat);

// Backwards-compatible Cow Summary endpoint
router.post('/cow-summary', getCattleAiSummary);

module.exports = router;
