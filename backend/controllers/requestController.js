const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const VetRequest = require('../models/VetRequest');
const Cattle = require('../models/Cattle');
const Notification = require('../models/Notification');
const User = require('../models/User');
const {
  isTransitionAllowed,
  isRoleAllowedForTransition,
} = require('../utils/requestStateMachine');
const { isVetOnDutyNow } = require('../utils/vetAvailability');
const { getIO } = require('../sockets/io');
const { DIRECT_REQUEST_FALLBACK_MINUTES } = require('../utils/directRequestFallback');
const { uploadToCloudinary } = require('../services/cloudinaryService');

const PRIORITY_LABELS = {
  EMERGENCY: '🔴 EMERGENCY',
  URGENT: '🟡 URGENT',
  ROUTINE: '🟢 ROUTINE',
};

async function notifyUser({ userId, type, title, message, priority, requestId, cattleId }) {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    priority: priority || 'INFO',
    relatedRequestId: requestId || null,
    relatedCattleId: cattleId || null,
  });

  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }
  return notification;
}

async function broadcastRequestToOnDutyVets(request, fallback = false) {
  const activeVets = await User.find({ role: 'VETERINARIAN', isActive: true, isAvailable: true });
  const vets = activeVets.filter((vet) => isVetOnDutyNow(vet));
  await Promise.all(vets.map((vet) => notifyUser({
    userId: vet._id, type: 'NEW_REQUEST',
    title: `${PRIORITY_LABELS[request.priority]} ${fallback ? 'Available request' : 'New veterinary request'}`,
    message: `${request.cattleNameSnapshot} (${request.cattleIdSnapshot}) - ${request.problemDescription}`,
    priority: request.priority, requestId: request._id, cattleId: request.cattleId,
  })));
  return vets.length;
}

// @route POST /api/requests
// @access Private (FARMER)
const createRequest = asyncHandler(async (req, res) => {
  const {
    cattleId,
    priority,
    problemDescription,
    location, // { lat, lng, address, source }
    preferredDate,
    preferredTime,
    requestedVeterinarianId,
  } = req.body;

  if (!cattleId || !priority || !problemDescription || !location || !preferredDate || !preferredTime) {
    res.status(400);
    throw new Error(
      'cattleId, priority, problemDescription, location, preferredDate, and preferredTime are required.'
    );
  }

  const cattle = await Cattle.findById(cattleId);
  if (!cattle) {
    res.status(404);
    throw new Error('Cattle not found.');
  }
  if (String(cattle.ownerId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only book visits for your own cattle.');
  }
  const requestedVet = requestedVeterinarianId
    ? await User.findOne({ _id: requestedVeterinarianId, role: 'VETERINARIAN', isActive: true })
    : null;
  if (requestedVeterinarianId && !requestedVet) {
    res.status(404);
    throw new Error('Selected veterinarian was not found.');
  }

  const photoFiles = req.files?.photos || [];
  const voiceNoteFile = req.files?.voiceNote?.[0] || null;

  // Upload photos to Cloudinary
  const attachments = await Promise.all(
    photoFiles.map(async (f) => {
      const result = await uploadToCloudinary(f.buffer, { folder: 'cowcare/requests' });
      return result.secure_url;
    })
  );

  // Upload voice note to Cloudinary (as raw file, not image)
  let voiceNoteUrl = null;
  if (voiceNoteFile) {
    try {
      voiceNoteUrl = await new Promise((resolve, reject) => {
        const { v2: cloudinary } = require('cloudinary');
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'cowcare/voicenotes', resource_type: 'auto' },
          (err, result) => err ? reject(err) : resolve(result.secure_url)
        );
        stream.end(voiceNoteFile.buffer);
      });
    } catch (err) {
      console.warn('[Cloudinary] Voice note upload failed (non-critical):', err.message);
    }
  }

  const parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;

  const request = await VetRequest.create({
    farmerId: req.user._id,
    cattleId: cattle._id,
    cattleIdSnapshot: cattle.cattleId,
    cattleNameSnapshot: cattle.name,
    priority,
    problemDescription,
    attachments,
    voiceNoteUrl,
    location: parsedLocation,
    preferredDate,
    preferredTime,
    status: 'REQUESTED',
    statusHistory: [{ status: 'REQUESTED', note: 'Request created by farmer.' }],
    requestedVeterinarianId: requestedVet?._id || null,
    directRequestExpiresAt: requestedVet ? new Date(Date.now() + DIRECT_REQUEST_FALLBACK_MINUTES * 60 * 1000) : null,
  });

  // Broadcast to veterinarians who are actually on duty right now — combines
  // the manual toggle with their recurring weekly schedule, if configured.
  const vets = requestedVet ? [requestedVet] : null;
  const notifiedCount = requestedVet ? 1 : await broadcastRequestToOnDutyVets(request);
  request.notifiedVeterinarianCount = notifiedCount;
  await request.save();

  if (requestedVet) await Promise.all(
    vets.map((vet) =>
      notifyUser({
        userId: vet._id,
        type: 'DIRECT_REQUEST',
        title: `${PRIORITY_LABELS[priority]} Direct veterinary request`,
        message: `${cattle.name} (${cattle.cattleId}) — ${problemDescription}${
          voiceNoteUrl ? ' 🎙️ Voice note attached.' : ''
        }`,
        priority,
        requestId: request._id,
        cattleId: cattle._id,
      })
    )
  );

  res.status(201).json({ success: true, request, notifiedVeterinarianCount: notifiedCount });
});

// @route GET /api/requests
// @access Private (role-based scoping)
const getRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};

  if (req.user.role === 'FARMER') {
    filter.farmerId = req.user._id;
  } else if (req.user.role === 'VETERINARIAN') {
    // Unassigned pending requests + requests assigned to this vet.
    filter.$or = [{ veterinarianId: req.user._id }, { veterinarianId: null, status: 'REQUESTED', requestedVeterinarianId: null }, { veterinarianId: null, status: 'REQUESTED', requestedVeterinarianId: req.user._id }];
  }
  // ADMIN sees everything.

  if (status) filter.status = status;

  // Pagination — unbounded queries here would be a real problem for ADMIN,
  // who has no farmer/vet filter narrowing the collection.
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    VetRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('farmerId', 'name phone')
      .populate('veterinarianId', 'name specialization'),
    VetRequest.countDocuments(filter),
  ]);

  // Sort truly by urgency (EMERGENCY > URGENT > ROUTINE), not alphabetically —
  // a plain string sort on the enum would put ROUTINE ahead of URGENT.
  // Applied within the page, since urgency ordering across pages would
  // require a DB-level $addFields rank, which isn't worth the complexity
  // for typical page sizes here.
  const PRIORITY_RANK = { EMERGENCY: 0, URGENT: 1, ROUTINE: 2 };
  requests.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  res.json({
    success: true,
    count: requests.length,
    requests,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// @route GET /api/requests/:id
// @access Private
const getRequestById = asyncHandler(async (req, res) => {
  const request = await VetRequest.findById(req.params.id)
    .populate('farmerId', 'name phone defaultLocation')
    .populate('veterinarianId', 'name specialization phone')
    .populate('cattleId');

  if (!request) {
    res.status(404);
    throw new Error('Request not found.');
  }

  res.json({ success: true, request });
});

// @route PATCH /api/requests/:id/status
// @access Private (VETERINARIAN primarily; FARMER for cancellation)
const updateRequestStatus = asyncHandler(async (req, res) => {
  const { status: nextStatus, note, rejectionReason, cancellationReason } = req.body;

  const existing = await VetRequest.findById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error('Request not found.');
  }

  if (!isTransitionAllowed(existing.status, nextStatus)) {
    res.status(400);
    throw new Error(`Cannot transition from ${existing.status} to ${nextStatus}.`);
  }

  if (!isRoleAllowedForTransition(nextStatus, req.user.role)) {
    res.status(403);
    throw new Error(`Role ${req.user.role} cannot perform this transition.`);
  }

  // Ownership checks for the acting role.
  if (req.user.role === 'FARMER' && String(existing.farmerId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You do not own this request.');
  }
  if (
    req.user.role === 'VETERINARIAN' &&
    existing.veterinarianId &&
    String(existing.veterinarianId) !== String(req.user._id)
  ) {
    res.status(403);
    throw new Error('This request is already assigned to another veterinarian.');
  }
  if (req.user.role === 'VETERINARIAN' && existing.status === 'REQUESTED' && existing.requestedVeterinarianId && String(existing.requestedVeterinarianId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('This request was directed to another veterinarian.');
  }

  if (nextStatus === 'REJECTED' && existing.requestedVeterinarianId && req.user.role === 'VETERINARIAN') {
    const request = await VetRequest.findOneAndUpdate(
      { _id: existing._id, status: 'REQUESTED', veterinarianId: null, requestedVeterinarianId: req.user._id },
      { $set: { requestedVeterinarianId: null, directRequestFallbackAt: new Date(), rejectionReason: rejectionReason || 'No reason provided.' }, $push: { statusHistory: { status: 'REQUESTED', note: `Direct request declined. ${rejectionReason || ''}` } } },
      { new: true }
    );
    if (!request) { res.status(409); throw new Error('This request was just updated. Please refresh.'); }
    const count = await broadcastRequestToOnDutyVets(request, true);
    request.directRequestFallbackNotifiedCount = count;
    request.notifiedVeterinarianCount += count;
    await request.save();
    await notifyUser({ userId: request.farmerId, type: 'REQUEST_REJECTED', title: 'Selected vet declined - finding another vet', message: `Your selected veterinarian declined the request for ${request.cattleNameSnapshot}. We notified ${count} available veterinarian${count === 1 ? '' : 's'}.`, priority: request.priority, requestId: request._id, cattleId: request.cattleId });
    return res.json({ success: true, request, broadcastFallback: true });
  }

  // Atomic conditional update — the query re-checks `status` (and, for a
  // first acceptance, that no vet has claimed it yet) at write time. This
  // closes a real race: if two veterinarians tap "Accept" on the same
  // request within milliseconds of each other, a plain read-then-save
  // would let both succeed, silently double-assigning the case. Here only
  // one write can match; the other gets a 409 and knows to refresh.
  const query = { _id: existing._id, status: existing.status };
  const update = {
    $set: { status: nextStatus },
    $push: { statusHistory: { status: nextStatus, note } },
  };

  if (nextStatus === 'ACCEPTED') {
    query.veterinarianId = null; // must still be unclaimed
    update.$set.veterinarianId = req.user._id;
  }
  if (nextStatus === 'REJECTED') {
    update.$set.rejectionReason = rejectionReason || 'No reason provided.';
  }
  if (nextStatus === 'CANCELLED') {
    update.$set.cancellationReason = cancellationReason || 'No reason provided.';
  }

  const request = await VetRequest.findOneAndUpdate(query, update, { new: true });

  if (!request) {
    res.status(409);
    throw new Error(
      'This request was just updated by someone else (e.g. another veterinarian already accepted it). Please refresh and try again.'
    );
  }

  // Notify the counterpart.
  const notifyTargetId =
    req.user.role === 'VETERINARIAN' ? request.farmerId : request.veterinarianId;

  if (notifyTargetId) {
    const { title, message } = buildStatusNotification(nextStatus, request, req.user);
    await notifyUser({
      userId: notifyTargetId,
      type: nextStatus === 'REJECTED' ? 'REQUEST_REJECTED' : 'STATUS_UPDATE',
      title,
      message,
      priority: request.priority,
      requestId: request._id,
      cattleId: request.cattleId,
    });
  }

  const io = getIO();
  if (io) {
    io.to(`request:${request._id}`).emit('requestStatusChanged', {
      requestId: request._id,
      status: nextStatus,
    });
  }

  res.json({ success: true, request });
});

/**
 * Builds a human, specific, actionable notification for a status change —
 * a raw enum value like "status is now REJECTED" tells a stressed farmer
 * nothing about what to do next.
 */
function buildStatusNotification(nextStatus, request, actingUser) {
  const cow = request.cattleNameSnapshot;
  const vetName = actingUser.role === 'VETERINARIAN' ? actingUser.name : null;

  switch (nextStatus) {
    case 'ACCEPTED':
      return {
        title: 'Request accepted',
        message: `Dr. ${vetName} has accepted your request for ${cow} and will be heading your way.`,
      };
    case 'ON_THE_WAY':
      return {
        title: 'Your vet is on the way',
        message: `Dr. ${vetName} is on the way to see ${cow}.`,
      };
    case 'ARRIVED':
      return {
        title: 'Your vet has arrived',
        message: `Dr. ${vetName} has arrived to examine ${cow}.`,
      };
    case 'IN_PROGRESS':
      return {
        title: 'Examination started',
        message: `The examination of ${cow} has begun.`,
      };
    case 'COMPLETED':
      return {
        title: 'Visit completed',
        message: `The visit for ${cow} is complete — treatment details have been added to the health timeline.`,
      };
    case 'REJECTED':
      return {
        title: 'Request declined',
        message: `Your request for ${cow} was declined${
          request.rejectionReason ? `: ${request.rejectionReason}` : ''
        }. Please submit a new request if ${cow} still needs attention.`,
      };
    case 'CANCELLED':
      return actingUser.role === 'FARMER'
        ? { title: 'Request cancelled', message: `The farmer cancelled the request for ${cow}.` }
        : {
            title: 'Visit cancelled',
            message: `Your veterinarian had to cancel this visit for ${cow}. Please submit a new request if it still needs attention.`,
          };
    default:
      return { title: `Request update: ${nextStatus}`, message: `${cow} — status is now ${nextStatus}.` };
  }
}

// @route POST /api/requests/:id/rating
// @access Private (FARMER, own request only, only after COMPLETED, only once)
const submitRating = asyncHandler(async (req, res) => {
  const { stars, comment } = req.body;

  const request = await VetRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error('Request not found.');
  }
  if (String(request.farmerId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only rate your own visits.');
  }
  if (request.status !== 'COMPLETED') {
    res.status(400);
    throw new Error('You can only rate a visit after it has been completed.');
  }
  if (request.rating?.stars) {
    res.status(409);
    throw new Error('This visit has already been rated.');
  }

  request.rating = { stars, comment, ratedAt: new Date() };
  await request.save();

  res.json({ success: true, request });
});

// @route GET /api/requests/vet-rating/:vetId
// @access Private — lets a farmer see a vet's track record, and a vet see
// their own aggregate rating on their profile.
const getVetRatingSummary = asyncHandler(async (req, res) => {
  const summary = await getVetRatingSummaryForVet(req.params.vetId);
  res.json({ success: true, ...summary });
});

async function getVetRatingSummaryForVet(vetId) {
  const [summary] = await VetRequest.aggregate([
    { $match: { veterinarianId: new mongoose.Types.ObjectId(vetId), 'rating.stars': { $ne: null } } },
    {
      $group: {
        _id: '$veterinarianId',
        averageStars: { $avg: '$rating.stars' },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  return {
    averageStars: summary ? Math.round(summary.averageStars * 10) / 10 : null,
    totalRatings: summary ? summary.totalRatings : 0,
  };
}

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequestStatus,
  notifyUser,
  submitRating,
  getVetRatingSummary,
  getVetRatingSummaryForVet,
  broadcastRequestToOnDutyVets,
};
