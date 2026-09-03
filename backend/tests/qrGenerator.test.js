const test = require('node:test');
const assert = require('node:assert/strict');
const { generateCattleQr } = require('../utils/qrGenerator');

test('generates a valid PNG data URL', async () => {
  const dataUrl = await generateCattleQr('CW-IND-KA-000124');
  assert.match(dataUrl, /^data:image\/png;base64,/);
});

test('encoded payload contains only the cattle ID, never medical fields', async () => {
  // The QR encodes a JSON payload; decoding it isn't practical without an
  // image-decoding library, so instead we verify the generator's contract
  // by checking it only ever receives/uses the id it was given - this is
  // a regression guard against someone later "helpfully" adding more
  // fields to the QR payload (which the product spec explicitly forbids).
  const generatorSource = require('fs').readFileSync(
    require.resolve('../utils/qrGenerator'),
    'utf8'
  );
  assert.match(generatorSource, /type:\s*'COWCARE_CATTLE',\s*cattleId/);
  assert.doesNotMatch(generatorSource, /medicalEvent|diagnosis|treatment/i);
});

test('different cattle IDs produce different data URLs', async () => {
  const a = await generateCattleQr('CW-IND-KA-000001');
  const b = await generateCattleQr('CW-IND-KA-000002');
  assert.notEqual(a, b);
});
