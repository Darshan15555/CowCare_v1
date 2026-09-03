/**
 * Creates an initial ADMIN account so the admin dashboard is actually
 * reachable after a fresh deployment (registration deliberately blocks
 * self-service ADMIN signup — see authController.register).
 *
 * Usage:
 *   node utils/seed.js
 *
 * Configure via env vars (all optional, sensible defaults provided):
 *   SEED_ADMIN_NAME, SEED_ADMIN_PHONE, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 *
 * Safe to run multiple times — does nothing if an admin with that phone
 * number already exists.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const ADMIN_NAME = process.env.SEED_ADMIN_NAME || 'CowCare Admin';
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE || '9999999999';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@cowcare.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

async function seedAdmin() {
  await connectDB();

  const existing = await User.findOne({ phone: ADMIN_PHONE });
  if (existing) {
    console.log(`[seed] Admin account already exists for phone ${ADMIN_PHONE}. Nothing to do.`);
    await mongoose.connection.close();
    return;
  }

  const admin = await User.create({
    name: ADMIN_NAME,
    phone: ADMIN_PHONE,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'ADMIN',
  });

  console.log('[seed] Admin account created:');
  console.log(`        phone:    ${admin.phone}`);
  console.log(`        password: ${ADMIN_PASSWORD}`);
  console.log('[seed] Log in with these credentials, then change the password immediately.');

  await mongoose.connection.close();
}

seedAdmin().catch((err) => {
  console.error('[seed] Failed to seed admin account:', err.message);
  process.exit(1);
});
