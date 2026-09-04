const mongoose = require('mongoose');

const cattleSchema = new mongoose.Schema(
  {
    cattleId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true,
      // Example: CW-IND-KA-000124
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    breed: { type: String, trim: true },
    gender: { type: String, enum: ['MALE', 'FEMALE'], required: true },
    dateOfBirth: { type: Date },
    estimatedAgeYears: { type: Number },
    color: { type: String, trim: true },
    identifyingMarks: { type: String, trim: true },
    photoUrl: { type: String, default: null },

    status: {
      type: String,
      enum: ['HEALTHY', 'UNDER_OBSERVATION', 'CRITICAL', 'RECOVERING'],
      default: 'HEALTHY',
    },

    // Marketplace / Cow Sale capability
    sale: {
      status: {
        type: String,
        enum: ['NOT_FOR_SALE', 'OPEN_FOR_SALE', 'SALE_PENDING', 'SOLD', 'REMOVED_FROM_SALE'],
        default: 'NOT_FOR_SALE',
        index: true,
      },
      askingPrice: { type: Number, min: 0 },
      description: { type: String, trim: true, maxlength: 1000 },
      listedAt: { type: Date },
      location: {
        address: { type: String, trim: true },
        lat: { type: Number },
        lng: { type: Number },
      },
      contactPhone: { type: String, trim: true },
    },

    // QR encodes ONLY the cattleId (see qrGenerator util). This stores the
    // rendered QR as a data URL for quick display without regeneration.
    qrCodeDataUrl: { type: String },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

cattleSchema.index({ ownerId: 1, isActive: 1 });
cattleSchema.index({ 'sale.status': 1, breed: 1, createdAt: -1 });

module.exports = mongoose.model('Cattle', cattleSchema);
