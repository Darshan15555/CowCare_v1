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
    .populate('toOwnerId', 'name phone');

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

  const isRecipient = String(transfer.toOwnerId) === String(req.user._id);
  const isInitiator = String(transfer.fromOwnerId) === String(req.user._id);

  if (action === 'CANCEL') {
    if (!isInitiator) {
      res.status(403);
      throw new Error('Only the person who started this transfer can cancel it.');
    }
  } else if (!isRecipient) {
    res.status(403);
    throw new Error('Only the recipient can accept or decline this transfer.');
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

    await notifyUser({
      userId: transfer.fromOwnerId,
      type: 'STATUS_UPDATE',
      title: 'Transfer accepted',
      message: `${req.user.name} accepted ownership of ${transfer.cattleNameSnapshot} (${transfer.cattleIdSnapshot}).`,
      priority: 'INFO',
      cattleId: transfer.cattleId,
    });
  } else if (action === 'REJECT') {
    transfer.status = 'REJECTED';
    transfer.respondedAt = new Date();
    await transfer.save();

    await notifyUser({
      userId: transfer.fromOwnerId,
      type: 'STATUS_UPDATE',
      title: 'Transfer declined',
      message: `${req.user.name} declined the transfer of ${transfer.cattleNameSnapshot} (${transfer.cattleIdSnapshot}).`,
      priority: 'INFO',
      cattleId: transfer.cattleId,
    });
  } else if (action === 'CANCEL') {
    transfer.status = 'CANCELLED';
    transfer.respondedAt = new Date();
    await transfer.save();
  } else {
    res.status(400);
    throw new Error('Invalid action. Must be ACCEPT, REJECT, or CANCEL.');
  }

  res.json({ success: true, transfer });
});

module.exports = { initiateTransfer, getMyTransfers, respondToTransfer };
