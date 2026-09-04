const asyncHandler = require('express-async-handler');
const Cattle = require('../models/Cattle');
const MedicalEvent = require('../models/MedicalEvent');
const VetRequest = require('../models/VetRequest');
const { generateCowSummary } = require('../services/geminiService');

// @route POST /api/ai/cow-summary
// @access Private (FARMER, VETERINARIAN, ADMIN)
const getCattleAiSummary = asyncHandler(async (req, res) => {
  const { cattleId, question, mode, requestId } = req.body;

  // Handle general marketplace advisory questions when not on a specific cow
  if (!cattleId || cattleId === 'GENERAL_MARKETPLACE') {
    const resolvedMode = req.user.role === 'FARMER' ? 'farmer' : mode === 'farmer' ? 'farmer' : 'veterinarian';
    const aiResult = await generateCowSummary({
      cattle: {
        cattleId: 'MARKETPLACE',
        name: 'CowCare Livestock Marketplace',
        breed: 'General Bovine Health',
        gender: 'FEMALE',
        status: 'HEALTHY',
        sale: { status: 'OPEN_FOR_SALE' },
      },
      timeline: [],
      mode: resolvedMode,
      question: question || 'What critical veterinary health points should I inspect before purchasing cattle in the marketplace?',
    });

    return res.json({
      success: true,
      cattleId: 'MARKETPLACE',
      mode: resolvedMode,
      answer: aiResult.answer,
      isFallback: aiResult.isFallback,
      model: aiResult.model,
    });
  }

  // Find cattle by MongoDB _id or permanent cattleId (e.g., CW-IND-24-000123)
  const isMongoId = /^[0-9a-fA-F]{24}$/.test(cattleId);
  const cattle = isMongoId
    ? await Cattle.findById(cattleId).populate('ownerId', 'name farmName phone')
    : await Cattle.findOne({ cattleId }).populate('ownerId', 'name farmName phone');

  if (!cattle || !cattle.isActive) {
    res.status(404);
    throw new Error('Cattle record not found.');
  }

  // Authorization check
  const isOwner = String(cattle.ownerId._id || cattle.ownerId) === String(req.user._id);
  const isOpenForSale = ['OPEN_FOR_SALE', 'SALE_PENDING'].includes(cattle.sale?.status);

  if (req.user.role === 'FARMER') {
    if (!isOwner && !isOpenForSale) {
      res.status(403);
      throw new Error('You are not authorized to query AI medical insights for this cattle.');
    }
  } else if (req.user.role === 'VETERINARIAN') {
    // Check if vet is assigned, or has request, or cow is open for sale
    const hasRequest = await VetRequest.exists({
      cattleId: cattle._id,
      $or: [{ veterinarianId: req.user._id }, { status: 'REQUESTED' }],
    });
    if (!hasRequest && !isOpenForSale && req.user.role !== 'ADMIN') {
      res.status(403);
      throw new Error('You are not authorized to view clinical AI insights for this cattle.');
    }
  }

  // Determine mode:
  // Farmers are always in 'farmer' mode. Vets default to 'veterinarian' unless explicitly requesting 'farmer' mode.
  const resolvedMode = req.user.role === 'FARMER' ? 'farmer' : mode === 'farmer' ? 'farmer' : 'veterinarian';

  // Fetch canonical medical timeline
  const timeline = await MedicalEvent.find({ cattleId: cattle._id })
    .sort({ eventDate: -1 })
    .populate('veterinarianId', 'name specialization');

  // Optional active case context
  let activeCase = null;
  if (requestId) {
    activeCase = await VetRequest.findById(requestId).select('symptoms description urgency createdAt');
  }

  const aiResult = await generateCowSummary({
    cattle,
    timeline,
    mode: resolvedMode,
    question: question || '',
    activeCase,
  });

  res.json({
    success: true,
    cattleId: cattle.cattleId,
    mode: resolvedMode,
    answer: aiResult.answer,
    isFallback: aiResult.isFallback,
    model: aiResult.model,
  });
});

module.exports = {
  getCattleAiSummary,
};
