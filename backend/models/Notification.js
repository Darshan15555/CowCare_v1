const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'NEW_REQUEST',
        'REQUEST_ACCEPTED',
        'REQUEST_REJECTED',
        'STATUS_UPDATE',
        'VISIT_COMPLETED',
        'FOLLOW_UP_REMINDER',
        'VACCINATION_REMINDER',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    priority: {
      type: String,
      enum: ['EMERGENCY', 'URGENT', 'ROUTINE', 'INFO'],
      default: 'INFO',
    },
    relatedRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VetRequest',
      default: null,
    },
    relatedCattleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cattle',
      default: null,
    },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
