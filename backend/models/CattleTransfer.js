const mongoose = require('mongoose');

const cattleTransferSchema = new mongoose.Schema(
  {
    cattleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cattle',
      required: true,
      index: true,
    },
    // Immutable snapshots so the transfer record stays meaningful even if
    // the cattle's name/ID display changes later.
    cattleIdSnapshot: { type: String, required: true },
    cattleNameSnapshot: { type: String, required: true },

    fromOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    toOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Only one active (PENDING) transfer per cattle at a time — enforced at the
// application layer in the controller (a partial unique index would be
// cleaner in a newer Mongoose/Mongo setup, but this keeps the model simple
// and the check explicit and readable).

module.exports = mongoose.model('CattleTransfer', cattleTransferSchema);
