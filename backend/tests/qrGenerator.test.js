const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCattleQr } = require('../utils/qrGenerator');

test('generates a valid PNG data URL', async () => {
  const dataUrl = await generateCattleQr('CW-IND-KA-000124');
  assert.match(dataUrl, /^data:image\/png;base64,/);
});

test('encoded payload contains only the cattle ID URL, never medical fields', async () => {
  // The QR encodes an authorized CowCare web URL containing only the cattleId.
  // We verify that the generator's source creates a URL with only the cattleId
  // and never includes private medical fields or diagnosis.
  const generatorSource = require('fs').readFileSync(
    require.resolve('../utils/qrGenerator'),
    'utf8'
  );
  assert.match(generatorSource, /\/qr\/cattle\/\$\{encodeURIComponent\(cattleId\)\}/);
  assert.doesNotMatch(generatorSource, /medicalEvent|diagnosis|treatment/i);
});

test('different cattle IDs produce different data URLs', async () => {
  const a = await generateCattleQr('CW-IND-KA-000001');
  const b = await generateCattleQr('CW-IND-KA-000002');
  assert.notEqual(a, b);
});
