const asyncHandler = require('express-async-handler');
const Cattle = require('../models/Cattle');
const MedicalEvent = require('../models/MedicalEvent');
const VetRequest = require('../models/VetRequest');
const { generateCattleId } = require('../utils/idGenerators');
const { generateCattleQr } = require('../utils/qrGenerator');

// @route POST /api/cattle
// @access Private (FARMER)
const addCattle = asyncHandler(async (req, res) => {
  const { name, breed, gender, dateOfBirth, estimatedAgeYears, color, identifyingMarks, stateCode } =
    req.body;

  if (!name || !gender) {
    res.status(400);
    throw new Error('Cattle name and gender are required.');
  }

  const cattleId = await generateCattleId(stateCode);
  const qrCodeDataUrl = await generateCattleQr(cattleId);

  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const cattle = await Cattle.create({
    cattleId,
    ownerId: req.user._id,
    name,
    breed,
    gender,
    dateOfBirth,
    estimatedAgeYears,
    color,
    identifyingMarks,
    photoUrl,
    qrCodeDataUrl,
  });

  res.status(201).json({ success: true, cattle });
});

// @route GET /api/cattle/mine
// @access Private (FARMER)
const getMyCattle = asyncHandler(async (req, res) => {
  const cattle = await Cattle.find({ ownerId: req.user._id, isActive: true }).sort({
    createdAt: -1,
  });
  res.json({ success: true, count: cattle.length, cattle });
});

// @route GET /api/cattle/:id
// @access Private (owner FARMER, assigned VETERINARIAN, or ADMIN)
const getCattleProfile = asyncHandler(async (req, res) => {
  const cattle = await Cattle.findById(req.params.id).populate(
    'ownerId',
    'name phone farmName'
  );

  if (!cattle) {
    res.status(404);
    throw new Error('Cattle not found.');
  }

  await authorizeCattleAccess(req.user, cattle);

  const timeline = await MedicalEvent.find({ cattleId: cattle._id })
    .sort({ eventDate: -1 })
    .populate('veterinarianId', 'name specialization');

  const activeCases = await VetRequest.find({
    cattleId: cattle._id,
    status: { $nin: ['COMPLETED', 'REJECTED', 'CANCELLED'] },
  }).sort({ createdAt: -1 });

  res.json({ success: true, cattle, timeline, activeCases });
});

// @route GET /api/cattle/scan/:cattleId
// @access Private (VETERINARIAN, ADMIN) - resolves a scanned QR to a profile
// This is the access-control checkpoint: the QR itself carries no medical data.
const scanCattleQr = asyncHandler(async (req, res) => {
  const cattle = await Cattle.findOne({ cattleId: req.params.cattleId }).populate(
    'ownerId',
    'name phone farmName'
  );

  if (!cattle) {
    res.status(404);
    throw new Error('No cattle found for this QR code.');
  }

  if (!['VETERINARIAN', 'ADMIN'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Only veterinarians can access cattle records via QR scan.');
  }

  const timeline = await MedicalEvent.find({ cattleId: cattle._id })
    .sort({ eventDate: -1 })
    .populate('veterinarianId', 'name specialization');

  res.json({ success: true, cattle, timeline });
});

// @route PATCH /api/cattle/:id
// @access Private (owner FARMER)
const updateCattle = asyncHandler(async (req, res) => {
  const cattle = await Cattle.findById(req.params.id);
  if (!cattle) {
    res.status(404);
    throw new Error('Cattle not found.');
  }

  if (String(cattle.ownerId) !== String(req.user._id) && req.user.role !== 'ADMIN') {
    res.status(403);
    throw new Error('You do not have permission to edit this cattle record.');
  }

  const editableFields = [
    'name',
    'breed',
    'color',
    'identifyingMarks',
    'status',
    'estimatedAgeYears',
  ];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) cattle[field] = req.body[field];
  });

  if (req.file) {
    cattle.photoUrl = `/uploads/${req.file.filename}`;
  }

  await cattle.save();
  res.json({ success: true, cattle });
});

/**
 * Shared authorization check: a farmer may only view their own cattle;
 * a veterinarian may view any cattle only in the context of an assigned
 * request (past or present) — reflecting real-world authorized access.
 */
async function authorizeCattleAccess(user, cattle) {
  if (user.role === 'ADMIN') return;

  if (user.role === 'FARMER') {
    if (String(cattle.ownerId._id || cattle.ownerId) !== String(user._id)) {
      const err = new Error('You do not have access to this cattle record.');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  if (user.role === 'VETERINARIAN') {
    const hasAssignment = await VetRequest.exists({
      cattleId: cattle._id,
      veterinarianId: user._id,
    });
    const hasOpenRequest = await VetRequest.exists({
      cattleId: cattle._id,
      status: 'REQUESTED',
      veterinarianId: null,
    });
    if (!hasAssignment && !hasOpenRequest) {
      const err = new Error('You are not authorized for this cattle record yet.');
      err.statusCode = 403;
      throw err;
    }
    return;
  }

  const err = new Error('Access denied.');
  err.statusCode = 403;
  throw err;
}

module.exports = { addCattle, getMyCattle, getCattleProfile, scanCattleQr, updateCattle };
