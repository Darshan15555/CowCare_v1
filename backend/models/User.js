const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizePhone } = require('../utils/normalizePhone');

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const weeklyScheduleDaySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday, matches Date#getDay()
    isWorking: { type: Boolean, default: true },
    startTime: { type: String, default: '09:00' }, // "HH:MM", 24-hour
    endTime: { type: String, default: '18:00' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },

    role: {
      type: String,
      enum: ['FARMER', 'VETERINARIAN', 'ADMIN'],
      required: true,
    },

    avatarUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },

    // ---- Farmer-specific fields ----
    farmName: { type: String, trim: true },
    defaultLocation: locationSchema,

    // ---- Veterinarian-specific fields ----
    specialization: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    yearsOfExperience: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true }, // vet on/off duty toggle (quick override)
    serviceAreaRadiusKm: { type: Number, default: 25 },
    // Recurring working hours. Empty array = no schedule configured, in
    // which case `isAvailable` alone determines on-duty status (fully
    // backward compatible with vets who never set this up).
    weeklySchedule: { type: [weeklyScheduleDaySchema], default: [] },
    // Opt-in: get alerted about EMERGENCY requests even while off duty,
    // if a case sits unaccepted too long. Off by default - a vet must
    // explicitly choose to be interrupted outside their normal hours.
    acceptsEmergencyOverride: { type: Boolean, default: false },

    // Refresh token rotation (hashed, single active session per device simplification)
    refreshTokenHash: { type: String, select: false, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', function normalizePhoneField(next) {
  if (this.isModified('phone') && this.phone) {
    this.phone = normalizePhone(this.phone);
  }
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
