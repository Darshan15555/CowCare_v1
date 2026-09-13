const asyncHandler = require('express-async-handler');
const MedicalEvent = require('../models/MedicalEvent');
const VetRequest = require('../models/VetRequest');
const Cattle = require('../models/Cattle');
const { generateMedicalEventId } = require('../utils/idGenerators');
const { notifyUser } = require('./requestController');
const { uploadToCloudinary } = require('../services/cloudinaryService');

// @route POST /api/medical/complete/:requestId
// @access Private (VETERINARIAN, must be assigned and request must be IN_PROGRESS)
// This is the single action that closes a visit: records examination +
// clinical assessment + treatment, and permanently appends it to the
// cattle's medical timeline.
const completeVisit = asyncHandler(async (req, res) => {
  const request = await VetRequest.findById(req.params.requestId);

  if (!request) {
    res.status(404);
    throw new Error('Request not found.');
  }
  if (String(request.veterinarianId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Only the assigned veterinarian can complete this visit.');
  }
  if (request.status !== 'IN_PROGRESS') {
    res.status(400);
    throw new Error('Visit must be IN_PROGRESS before it can be completed.');
  }

  const {
    observedSymptoms,
    physicalFindings,
    vitals,
    examinationNotes,
    clinicalAssessment,
    treatmentPerformed,
    medicines, // array of { name, dosage, frequency, duration, route, instructions }
    followUpDate,
    additionalNotes,
  } = req.body;

  if (!clinicalAssessment || !treatmentPerformed) {
    res.status(400);
    throw new Error('Clinical assessment and treatment performed are required to complete a visit.');
  }

  const cattle = await Cattle.findById(request.cattleId);
  const eventId = await generateMedicalEventId();
  const examPhotos = await Promise.all(
    (req.files || []).map(async (f) => {
      const result = await uploadToCloudinary(f.buffer, { folder: 'cowcare/medical' });
      return result.secure_url;
    })
  );

  const medicalEvent = await MedicalEvent.create({
    eventId,
    cattleId: request.cattleId,
    requestId: request._id,
    veterinarianId: req.user._id,
    farmerId: request.farmerId,
    eventType: 'VISIT',
    farmerReportedSymptoms: request.problemDescription, // read-only snapshot
    examination: {
      observedSymptoms,
      physicalFindings,
      vitals: vitals ? (typeof vitals === 'string' ? JSON.parse(vitals) : vitals) : undefined,
      notes: examinationNotes,
      photos: examPhotos,
    },
    clinicalAssessment,
    treatment: {
      performed: treatmentPerformed,
      medicines: medicines ? (typeof medicines === 'string' ? JSON.parse(medicines) : medicines) : [],
      followUpDate: followUpDate || null,
      additionalNotes,
    },
  });

  request.status = 'COMPLETED';
  request.statusHistory.push({ status: 'COMPLETED', note: 'Visit completed and recorded.' });
  request.medicalEventId = medicalEvent._id;
  await request.save();

  // Update cattle status based on clinical outcome (vet-driven, not automatic diagnosis).
  if (cattle) {
    cattle.status = followUpDate ? 'RECOVERING' : 'HEALTHY';
    await cattle.save();
  }

  await notifyUser({
    userId: request.farmerId,
    type: 'VISIT_COMPLETED',
    title: 'Veterinary visit completed',
    message: `${request.cattleNameSnapshot} (${request.cattleIdSnapshot}) — visit completed. Treatment recorded.`,
    priority: 'INFO',
    requestId: request._id,
    cattleId: request.cattleId,
  });

  res.status(201).json({ success: true, medicalEvent, request });
});

// @route POST /api/medical/vaccination/:cattleId
// @access Private (VETERINARIAN)
const recordVaccination = asyncHandler(async (req, res) => {
  const { vaccineName, nextDueDate, additionalNotes } = req.body;
  const cattle = await Cattle.findById(req.params.cattleId);
  if (!cattle) {
    res.status(404);
    throw new Error('Cattle not found.');
  }
  if (!vaccineName) {
    res.status(400);
    throw new Error('Vaccine name is required.');
  }

  const eventId = await generateMedicalEventId();
  const medicalEvent = await MedicalEvent.create({
    eventId,
    cattleId: cattle._id,
    veterinarianId: req.user._id,
    farmerId: cattle.ownerId,
    eventType: 'VACCINATION',
    vaccination: { vaccineName, nextDueDate: nextDueDate || null },
    treatment: { additionalNotes },
  });

  res.status(201).json({ success: true, medicalEvent });
});

// @route GET /api/medical/cattle/:cattleId/timeline
// @access Private
const getCattleTimeline = asyncHandler(async (req, res) => {
  const timeline = await MedicalEvent.find({ cattleId: req.params.cattleId })
    .sort({ eventDate: -1 })
    .populate('veterinarianId', 'name specialization');
  res.json({ success: true, count: timeline.length, timeline });
});

// @route GET /api/medical/:eventId
// @access Private
const getMedicalEventById = asyncHandler(async (req, res) => {
  const event = await MedicalEvent.findById(req.params.eventId)
    .populate('veterinarianId', 'name specialization')
    .populate('farmerId', 'name phone')
    .populate('cattleId', 'name cattleId');
  if (!event) {
    res.status(404);
    throw new Error('Medical event not found.');
  }
  res.json({ success: true, event });
});

// @route GET /api/medical/reminders
// @access Private (FARMER sees reminders for their cattle; VETERINARIAN sees
// follow-ups for cases they personally treated)
const getUpcomingReminders = asyncHandler(async (req, res) => {
  const windowDays = Number(req.query.days) || 30;
  const rangeEnd = new Date();
  rangeEnd.setDate(rangeEnd.getDate() + windowDays);

  const baseFilter =
    req.user.role === 'FARMER' ? { farmerId: req.user._id } : { veterinarianId: req.user._id };

  const reminders = await MedicalEvent.find({
    ...baseFilter,
    $or: [
      { 'treatment.followUpDate': { $ne: null, $lte: rangeEnd } },
      { 'vaccination.nextDueDate': { $ne: null, $lte: rangeEnd } },
    ],
  })
    .sort({ 'treatment.followUpDate': 1, 'vaccination.nextDueDate': 1 })
    .populate('cattleId', 'name cattleId')
    .limit(50);

  res.json({ success: true, count: reminders.length, reminders });
});

module.exports = {
  completeVisit,
  recordVaccination,
  getCattleTimeline,
  getMedicalEventById,
  getUpcomingReminders,
};
