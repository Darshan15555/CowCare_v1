const asyncHandler = require('express-async-handler');
const Cattle = require('../models/Cattle');
const CattleTransfer = require('../models/CattleTransfer');
const User = require('../models/User');
const { notifyUser } = require('./requestController');
const { normalizePhone } = require('../utils/normalizePhone');

// @route POST /api/cattle/:id/transfer
// @access Private (FARMER, must own the cattle)
const initiateTransfer = asyncHandler(async (req, res) => {
  const { toPhone } = req.body;

  const cattle = await Cattle.findById(req.params.id);
  if (!cattle) {
    res.status(404);
    throw new Error('Cattle not found.');
  }
  if (String(cattle.ownerId) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only transfer cattle you own.');
  }

  const newOwner = await User.findOne({ phone: normalizePhone(toPhone), role: 'FARMER', isActive: true });
  if (!newOwner) {
    res.status(404);
    throw new Error('No active farmer account found with that phone number. They need to register first.');
  }
  if (String(newOwner._id) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot transfer cattle to yourself.');
  }

  const existingPending = await CattleTransfer.findOne({ cattleId: cattle._id, status: 'PENDING' });
  if (existingPending) {
    res.status(409);
    throw new Error('There is already a pending transfer for this cattle. Cancel it before starting a new one.');
  }

  const transfer = await CattleTransfer.create({
    cattleId: cattle._id,
    cattleIdSnapshot: cattle.cattleId,
    cattleNameSnapshot: cattle.name,
    fromOwnerId: req.user._id,
    toOwnerId: newOwner._id,
    requestType: 'DIRECT_TRANSFER',
    initiatedBy: req.user._id,
    status: 'PENDING',
  });

  await notifyUser({
    userId: newOwner._id,
    type: 'STATUS_UPDATE',
    title: 'Cattle transfer request',
    message: `${req.user.name} wants to transfer ${cattle.name} (${cattle.cattleId}) to you. Review it to accept or decline.`,
    priority: 'INFO',
    cattleId: cattle._id,
  });

  res.status(201).json({ success: true, transfer });
});

// @route GET /api/cattle/transfers
// @access Private (FARMER) — both incoming and outgoing pending/past transfers
const getMyTransfers = asyncHandler(async (req, res) => {
  const transfers = await CattleTransfer.find({
    $or: [{ fromOwnerId: req.user._id }, { toOwnerId: req.user._id }],
  })
    .sort({ createdAt: -1 })
    .populate('fromOwnerId', 'name phone')
    .populate('toOwnerId', 'name phone')
    .populate('initiatedBy', 'name phone');

  res.json({ success: true, count: transfers.length, transfers });
});

// @route PATCH /api/cattle/transfers/:transferId
// @access Private (FARMER) — recipient accepts/rejects; initiator can cancel
const respondToTransfer = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'ACCEPT' | 'REJECT' | 'CANCEL'

  const transfer = await CattleTransfer.findById(req.params.transferId);
  if (!transfer) {
    res.status(404);
    throw new Error('Transfer not found.');
  }
  if (transfer.status !== 'PENDING') {
    res.status(400);
    throw new Error(`This transfer has already been ${transfer.status.toLowerCase()}.`);
  }

  let isBuyerRequest = transfer.requestType === 'BUYER_REQUEST' || (transfer.initiatedBy && String(transfer.initiatedBy) === String(transfer.toOwnerId));

  if (!isBuyerRequest) {
    const cow = await Cattle.findById(transfer.cattleId);
    if (cow && ['OPEN_FOR_SALE', 'SALE_PENDING', 'SOLD'].includes(cow.sale?.status)) {
      isBuyerRequest = true;
    }
  }

  // In BUYER_REQUEST: buyer (toOwnerId) requested -> owner (fromOwnerId) receives and responds (ACCEPT/REJECT), buyer can CANCEL
  // In DIRECT_TRANSFER: owner (fromOwnerId) sent -> recipient (toOwnerId) receives and responds (ACCEPT/REJECT), owner can CANCEL
  const responderId = isBuyerRequest ? transfer.fromOwnerId : transfer.toOwnerId;
  const initiatorId = isBuyerRequest ? transfer.toOwnerId : transfer.fromOwnerId;

  const isResponder = String(responderId) === String(req.user._id);
  const isInitiator = String(initiatorId) === String(req.user._id);

  if (action === 'CANCEL') {
    if (!isInitiator) {
      res.status(403);
      throw new Error('Only the person who started this transfer request can cancel it.');
    }
  } else if (!isResponder) {
    res.status(403);
    throw new Error('Only the recipient of this transfer request can accept or decline it.');
  }

  if (action === 'ACCEPT') {
    // Atomic guard: only proceed if the cattle is still owned by the
    // original sender at the moment of acceptance (defends against an
    // extremely unlikely but possible double-transfer race).
    const updatedCattle = await Cattle.findOneAndUpdate(
      { _id: transfer.cattleId, ownerId: transfer.fromOwnerId },
      { ownerId: transfer.toOwnerId },
      { new: true }
    );
    if (!updatedCattle) {
      res.status(409);
      throw new Error('This cattle record has already changed hands. Please refresh.');
    }

    // If the cattle was on the marketplace, mark the sale as SOLD
    if (['OPEN_FOR_SALE', 'SALE_PENDING'].includes(updatedCattle.sale?.status)) {
      updatedCattle.sale.status = 'SOLD';
      await updatedCattle.save();
    }

    transfer.status = 'ACCEPTED';
    transfer.respondedAt = new Date();
    await transfer.save();

    const notifyTarget = isBuyerRequest ? transfer.toOwnerId : transfer.fromOwnerId;
    await notifyUser({
      userId: notifyTarget,
      type: 'STATUS_UPDATE',
      title: 'Transfer accepted',
      message: isBuyerRequest
        ? `${req.user.name} accepted your ownership request for ${transfer.cattleNameSnapshot} (${transfer.cattleIdSnapshot}). You are now the official owner!`
        : `${req.user.name} accepted ownership of ${transfer.cattleNameSnapshot} (${transfer.cattleIdSnapshot}).`,
      priority: 'INFO',
      cattleId: transfer.cattleId,
    });
  } else if (action === 'REJECT') {
    transfer.status = 'REJECTED';
    transfer.respondedAt = new Date();
    await transfer.save();

    // If cattle was on marketplace in SALE_PENDING, revert back to OPEN_FOR_SALE
    const cattle = await Cattle.findById(transfer.cattleId);
    if (cattle && cattle.sale?.status === 'SALE_PENDING') {
      cattle.sale.status = 'OPEN_FOR_SALE';
      await cattle.save();
    }

    const notifyTarget = isBuyerRequest ? transfer.toOwnerId : transfer.fromOwnerId;
    await notifyUser({
      userId: notifyTarget,
      type: 'STATUS_UPDATE',
      title: 'Transfer declined',
      message: isBuyerRequest
        ? `${req.user.name} declined the ownership request for ${transfer.cattleNameSnapshot} (${transfer.cattleIdSnapshot}).`
        : `${req.user.name} declined the transfer of ${transfer.cattleNameSnapshot} (${transfer.cattleIdSnapshot}).`,
      priority: 'INFO',
      cattleId: transfer.cattleId,
    });
  } else if (action === 'CANCEL') {
    transfer.status = 'CANCELLED';
    transfer.respondedAt = new Date();
    await transfer.save();

    // If cattle was on marketplace in SALE_PENDING, revert back to OPEN_FOR_SALE
    const cattle = await Cattle.findById(transfer.cattleId);
    if (cattle && cattle.sale?.status === 'SALE_PENDING') {
      cattle.sale.status = 'OPEN_FOR_SALE';
      await cattle.save();
    }
  } else {
    res.status(400);
    throw new Error('Invalid action. Must be ACCEPT, REJECT, or CANCEL.');
  }

  // Real-time synchronization to both parties
  try {
    const { getIO } = require('../sockets/io');
    const io = getIO();
    if (io) {
      io.to(`user:${transfer.fromOwnerId}`).emit('transfer_update', { transferId: transfer._id, action });
      io.to(`user:${transfer.toOwnerId}`).emit('transfer_update', { transferId: transfer._id, action });
    }
  } catch {
    // Socket emit is best-effort
  }

  res.json({ success: true, transfer });
});

module.exports = { initiateTransfer, getMyTransfers, respondToTransfer };
