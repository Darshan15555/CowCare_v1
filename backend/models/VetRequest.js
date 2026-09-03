const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, trim: true },
    source: {
      type: String,
      enum: ['DEFAULT_FARM', 'CURRENT_LOCATION', 'MANUAL'],
      default: 'DEFAULT_FARM',
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const REQUEST_STATUSES = [
  'REQUESTED',
  'ACCEPTED',
  'REJECTED',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

const vetRequestSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    veterinarianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    cattleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cattle',
      required: true,
    },
    // Lightweight snapshot for fast list rendering without populate.
    cattleIdSnapshot: { type: String, required: true },
    cattleNameSnapshot: { type: String, required: true },

    priority: {
      type: String,
      enum: ['EMERGENCY', 'URGENT', 'ROUTINE'],
      required: true,
    },

    problemDescription: { type: String, required: true, trim: true },
    attachments: [{ type: String }], // uploaded photo URLs
    voiceNoteUrl: { type: String, default: null }, // optional farmer voice message

    location: { type: locationSchema, required: true },

    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true }, // e.g. "16:00"

    status: { type: String, enum: REQUEST_STATUSES, default: 'REQUESTED', index: true },
    statusHistory: [statusHistorySchema],

    // How many veterinarians were actually notified when this was created.
    // Surfaced back to the farmer if it was zero, so a stalled REQUESTED
    // case doesn't look like a silent failure or a bug.
    notifiedVeterinarianCount: { type: Number, default: 0 },

    veterinarianResponseNote: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    cancellationReason: { type: String, trim: true },

    // Set once the case is completed and a MedicalEvent is created.
    medicalEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalEvent',
      default: null,
    },

    // Farmer's post-visit feedback - only settable once, only after COMPLETED.
    rating: {
      stars: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, trim: true, maxlength: 500 },
      ratedAt: { type: Date, default: null },
    },

    // Set when an unaccepted EMERGENCY request has sat too long and the
    // system re-broadcasts it more aggressively (see utils/escalation.js).
    escalatedAt: { type: Date, default: null },
    escalationNotifiedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

vetRequestSchema.index({ veterinarianId: 1, status: 1 });
vetRequestSchema.index({ farmerId: 1, status: 1 });

module.exports = mongoose.model('VetRequest', vetRequestSchema);
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
