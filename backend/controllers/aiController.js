const asyncHandler = require('express-async-handler');
const Cattle = require('../models/Cattle');
const MedicalEvent = require('../models/MedicalEvent');
const VetRequest = require('../models/VetRequest');
const User = require('../models/User');
const { generateCowChat, generateCowSummary } = require('../services/openaiService');

/**
 * Helper to fetch, validate, and authorize cattle access
 */
async function loadAuthorizedCattle({ cattleId, user }) {
  if (!cattleId || cattleId === 'GENERAL_MARKETPLACE' || cattleId === 'MARKETPLACE') {
    return {
      isMarketplace: true,
      cattle: {
        cattleId: 'MARKETPLACE',
        name: 'CowCare Livestock Marketplace',
        breed: 'General Bovine Health',
        gender: 'FEMALE',
        status: 'HEALTHY',
        sale: { status: 'OPEN_FOR_SALE' },
      },
    };
  }

  const isMongoId = /^[0-9a-fA-F]{24}$/.test(cattleId);
  const cattle = isMongoId
    ? await Cattle.findById(cattleId).populate('ownerId', 'name farmName phone')
    : await Cattle.findOne({ cattleId }).populate('ownerId', 'name farmName phone');

  if (!cattle || !cattle.isActive) {
    const error = new Error('Cattle record not found.');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  const isOwner = String(cattle.ownerId._id || cattle.ownerId) === String(user._id);
  const isOpenForSale = ['OPEN_FOR_SALE', 'SALE_PENDING'].includes(cattle.sale?.status);

  if (user.role === 'FARMER') {
    if (!isOwner && !isOpenForSale) {
      const error = new Error('You are not authorized to query AI medical insights for this cattle.');
      error.statusCode = 403;
      throw error;
    }
  } else if (user.role === 'VETERINARIAN') {
    const hasRequest = await VetRequest.exists({
      cattleId: cattle._id,
      $or: [{ veterinarianId: user._id }, { status: 'REQUESTED' }],
    });
    if (!hasRequest && !isOpenForSale && user.role !== 'ADMIN') {
      const error = new Error('You are not authorized to view clinical AI insights for this cattle.');
      error.statusCode = 403;
      throw error;
    }
  }

  return { isMarketplace: false, cattle };
}

// @route POST /api/ai/chat
// @access Private (FARMER, VETERINARIAN, ADMIN)
const aiChat = asyncHandler(async (req, res) => {
  const { cattleId, message, question, conversationHistory = [], mode, language, requestId } = req.body;
  const userPrompt = message || question || '';

  console.log(`[AI Chat] User authenticated: ${req.user._id} (${req.user.role})`);

  const { isMarketplace, cattle } = await loadAuthorizedCattle({
    cattleId,
    user: req.user,
  });

  const resolvedMode = req.user.role === 'FARMER' ? 'farmer' : mode === 'farmer' ? 'farmer' : 'veterinarian';
  const resolvedLanguage = language || req.user.preferredLanguage || 'en';

  let timeline = [];
  let activeCase = null;

  if (!isMarketplace) {
    console.log(`[AI Chat] Cattle loaded: ${cattle.cattleId} (${cattle.name})`);

    // Fetch canonical medical timeline sorted newest to oldest
    timeline = await MedicalEvent.find({ cattleId: cattle._id })
      .sort({ eventDate: -1 })
      .populate('veterinarianId', 'name specialization phone');

    console.log(`[AI Chat] Medical events loaded: ${timeline.length}`);

    // Optional active consultation case
    if (requestId) {
      activeCase = await VetRequest.findById(requestId).select('symptoms problemDescription description urgency createdAt status');
    }
  } else {
    console.log(`[AI Chat] General Marketplace context loaded`);
  }

  const historyLength = Array.isArray(conversationHistory) ? conversationHistory.length : 0;
  console.log(`[AI Chat] Conversation history turns: ${historyLength}`);
  console.log(`[AI Chat] Sending grounded context to model`);

  const aiResult = await generateCowChat({
    cattle,
    timeline,
    mode: resolvedMode,
    message: userPrompt,
    conversationHistory,
    activeCase,
    language: resolvedLanguage,
  });

  console.log(`[AI Chat] Response received (model: ${aiResult.model || 'fallback'}, isFallback: ${aiResult.isFallback})`);

  res.json({
    success: true,
    cattleId: cattle.cattleId,
    mode: resolvedMode,
    answer: aiResult.answer,
    isFallback: aiResult.isFallback,
    model: aiResult.model,
  });
});

// @route POST /api/ai/cow-summary
// @access Private (FARMER, VETERINARIAN, ADMIN)
// Backwards-compatible route forwarding directly to aiChat logic
const getCattleAiSummary = aiChat;

module.exports = {
  aiChat,
  getCattleAiSummary,
};
