const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
    duration: { type: String, trim: true },
    route: { type: String, trim: true }, // oral, injection, topical, etc.
    instructions: { type: String, trim: true },
  },
  { _id: false }
);

const medicalEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, immutable: true }, // ME-000001

    cattleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cattle',
      required: true,
      index: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VetRequest',
      default: null,
    },
    veterinarianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    eventType: {
      type: String,
      enum: ['VISIT', 'TREATMENT', 'VACCINATION', 'FOLLOW_UP'],
      default: 'VISIT',
    },

    eventDate: { type: Date, default: Date.now },

    // --- Strictly separated clinical sections (never mixed in UI) ---
    farmerReportedSymptoms: { type: String, trim: true }, // copied read-only from request

    examination: {
      observedSymptoms: { type: String, trim: true },
      physicalFindings: { type: String, trim: true },
      vitals: {
        temperatureC: { type: Number },
        heartRateBpm: { type: Number },
        respirationRate: { type: Number },
      },
      notes: { type: String, trim: true },
      photos: [{ type: String }],
    },

    clinicalAssessment: { type: String, trim: true }, // diagnosis, vet's decision only

    treatment: {
      performed: { type: String, trim: true },
      medicines: [medicineSchema],
      followUpDate: { type: Date, default: null },
      additionalNotes: { type: String, trim: true },
    },

    // For standalone vaccination events
    vaccination: {
      vaccineName: { type: String, trim: true },
      nextDueDate: { type: Date },
    },

    attachments: [{ type: String }],
  },
  { timestamps: true }
);

medicalEventSchema.index({ cattleId: 1, eventDate: -1 });

module.exports = mongoose.model('MedicalEvent', medicalEventSchema);
