/**
 * Normalizes a phone number by stripping spaces, dashes, and parentheses -
 * common ways people naturally format a phone number when typing. Without
 * this, "9876543210" and "98765 43210" would be treated as different
 * accounts, which could silently lock someone out at login even though
 * their credentials are correct.
 *
 * Keeps a leading + (for country codes) and all digits; strips everything
 * else.
 */
function normalizePhone(phone) {
  if (!phone) return phone;
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

module.exports = { normalizePhone };
