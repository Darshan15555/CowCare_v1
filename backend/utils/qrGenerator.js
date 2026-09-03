const QRCode = require('qrcode');

/**
 * Generates a QR code (as a data URL) that encodes ONLY the cattle's unique
 * identifier — never medical history. Scanning it should resolve, via the
 * backend, to /api/cattle/scan/:cattleId, which then applies normal
 * authorization rules before returning any profile or medical data.
 */
async function generateCattleQr(cattleId) {
  const payload = JSON.stringify({ type: 'COWCARE_CATTLE', cattleId });
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
  });
}

module.exports = { generateCattleQr };
