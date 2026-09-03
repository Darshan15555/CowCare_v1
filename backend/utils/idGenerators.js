const { getNextSequence } = require('../models/Counter');

const pad = (num, size) => String(num).padStart(size, '0');

/**
 * Generates a permanent, unique cattle identifier.
 * Format: CW-{COUNTRY}-{STATE}-{6-digit sequence}
 * Example: CW-IND-KA-000124
 *
 * The sequence is scoped per country+state so IDs stay meaningful and short,
 * while remaining globally unique because the prefix is embedded in the key.
 */
async function generateCattleId(stateCode = 'XX') {
  const country = process.env.CATTLE_ID_COUNTRY || 'IND';
  const state = (stateCode || 'XX').toUpperCase();
  const key = `cattleId:${country}:${state}`;
  const seq = await getNextSequence(key);
  return `CW-${country}-${state}-${pad(seq, 6)}`;
}

/**
 * Generates a permanent medical event identifier.
 * Format: ME-{6-digit sequence}
 */
async function generateMedicalEventId() {
  const seq = await getNextSequence('medicalEvent');
  return `ME-${pad(seq, 6)}`;
}

module.exports = { generateCattleId, generateMedicalEventId };
