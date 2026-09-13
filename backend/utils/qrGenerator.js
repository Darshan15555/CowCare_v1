const QRCode = require('qrcode');

/**
 * Generates a QR code (as a data URL) that encodes a CowCare frontend URL
 * for the cattle's profile. The QR contains ONLY a URL — never medical
 * history, auth tokens, or private data. When scanned, the user's phone
 * opens the CowCare web app, which then authenticates and authorizes before
 * fetching any medical data from the protected backend API.
 *
 * Example QR payload:
 *   https://cow-care-v1.vercel.app/qr/cattle/CW-IND-KA-000005
 */
async function generateCattleQr(cattleId) {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const qrUrl = `${clientUrl}/qr/cattle/${encodeURIComponent(cattleId)}`;

  return QRCode.toDataURL(qrUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
  });
}

module.exports = { generateCattleQr };
