const test = require('node:test');
const assert = require('node:assert/strict');
const { validationResult } = require('express-validator');
const {
  registerValidators,
  loginValidators,
  changePasswordValidators,
} = require('../validators/authValidators');
const { createRequestValidators, submitRatingValidators } = require('../validators/requestValidators');
const {
  initiateTransferValidators,
  respondToTransferValidators,
} = require('../validators/cattleTransferValidators');
const { addCattleValidators } = require('../validators/cattleValidators');
const { vetIdValidators, vetDirectoryValidators } = require('../validators/vetValidators');

/**
 * Runs an express-validator chain against a fake request body and returns
 * whether validation passed, without needing an actual HTTP server.
 */
async function runValidators(validators, body) {
  const req = { body, query: {}, params: {} };
  for (const validator of validators) {
    await validator.run(req);
  }
  const result = validationResult(req);
  return { isValid: result.isEmpty(), errors: result.array() };
}

test('registration rejects a missing role', async () => {
  const { isValid, errors } = await runValidators(registerValidators, {
    name: 'Ramesh',
    phone: '9876543210',
    password: 'secret123',
  });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'role'));
});

test('registration rejects a malformed phone number', async () => {
  const { isValid } = await runValidators(registerValidators, {
    name: 'Ramesh',
    phone: 'not-a-phone',
    password: 'secret123',
    role: 'FARMER',
  });
  assert.equal(isValid, false);
});

test('registration rejects a short password', async () => {
  const { isValid } = await runValidators(registerValidators, {
    name: 'Ramesh',
    phone: '9876543210',
    password: '123',
    role: 'FARMER',
  });
  assert.equal(isValid, false);
});

test('registration accepts a well-formed farmer payload', async () => {
  const { isValid } = await runValidators(registerValidators, {
    name: 'Ramesh',
    phone: '9876543210',
    password: 'secret123',
    role: 'FARMER',
    farmName: 'Ramesh Dairy Farm',
  });
  assert.equal(isValid, true);
});

test('registration rejects ADMIN as a self-registrable role', async () => {
  const { isValid, errors } = await runValidators(registerValidators, {
    name: 'Sneaky',
    phone: '9876543210',
    password: 'secret123',
    role: 'ADMIN',
  });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'role'));
});

test('login rejects an empty password', async () => {
  const { isValid } = await runValidators(loginValidators, { phone: '9876543210', password: '' });
  assert.equal(isValid, false);
});

test('cattle creation rejects an invalid gender value', async () => {
  const { isValid, errors } = await runValidators(addCattleValidators, {
    name: 'Lakshmi',
    gender: 'UNKNOWN',
  });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'gender'));
});

test('cattle creation accepts a valid payload', async () => {
  const { isValid } = await runValidators(addCattleValidators, {
    name: 'Lakshmi',
    gender: 'FEMALE',
    breed: 'Gir',
  });
  assert.equal(isValid, true);
});

test('booking request rejects out-of-range coordinates', async () => {
  const { isValid, errors } = await runValidators(createRequestValidators, {
    cattleId: '507f1f77bcf86cd799439011',
    priority: 'EMERGENCY',
    problemDescription: 'Cow has stopped eating.',
    location: { lat: 200, lng: 999, address: 'Somewhere' },
    preferredDate: '2026-09-01',
    preferredTime: '16:00',
  });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'location.lat'));
  assert.ok(errors.some((e) => e.path === 'location.lng'));
});

test('booking request rejects a malformed preferred time', async () => {
  const { isValid } = await runValidators(createRequestValidators, {
    cattleId: '507f1f77bcf86cd799439011',
    priority: 'ROUTINE',
    problemDescription: 'Routine checkup.',
    location: { lat: 12.9, lng: 77.6, address: 'Farm' },
    preferredDate: '2026-09-01',
    preferredTime: '4pm',
  });
  assert.equal(isValid, false);
});

test('booking request parses a JSON-stringified location (multipart form case)', async () => {
  const { isValid } = await runValidators(createRequestValidators, {
    cattleId: '507f1f77bcf86cd799439011',
    priority: 'URGENT',
    problemDescription: 'Limping on rear leg.',
    location: JSON.stringify({ lat: 12.9, lng: 77.6, address: 'Farm', source: 'MANUAL' }),
    preferredDate: '2026-09-01',
    preferredTime: '09:30',
  });
  assert.equal(isValid, true);
});

test('booking request rejects an invalid priority value', async () => {
  const { isValid, errors } = await runValidators(createRequestValidators, {
    cattleId: '507f1f77bcf86cd799439011',
    priority: 'SUPER_URGENT',
    problemDescription: 'Test.',
    location: { lat: 12.9, lng: 77.6 },
    preferredDate: '2026-09-01',
    preferredTime: '09:30',
  });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'priority'));
});

test('booking request validates an optional requested veterinarian id', async () => {
  const base = { cattleId: '507f1f77bcf86cd799439011', priority: 'ROUTINE', problemDescription: 'Checkup', location: { lat: 12.9, lng: 77.6 }, preferredDate: '2026-09-01', preferredTime: '09:30' };
  assert.equal((await runValidators(createRequestValidators, { ...base, requestedVeterinarianId: '507f1f77bcf86cd799439012' })).isValid, true);
  assert.equal((await runValidators(createRequestValidators, { ...base, requestedVeterinarianId: 'not-an-id' })).isValid, false);
});

test('vet directory validators reject invalid ids and on-duty flag', async () => {
  assert.equal((await runValidators(vetIdValidators, { })).isValid, false);
  const req = { body: {}, query: { onDutyOnly: 'maybe' }, params: {} };
  for (const validator of vetDirectoryValidators) await validator.run(req);
  assert.equal(validationResult(req).isEmpty(), false);
});

test('rating rejects a value outside 1-5', async () => {
  const { isValid, errors } = await runValidators(submitRatingValidators, { stars: 6 });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'stars'));
});

test('rating rejects a non-integer value', async () => {
  const { isValid } = await runValidators(submitRatingValidators, { stars: 3.5 });
  assert.equal(isValid, false);
});

test('rating accepts a valid stars-only submission (comment optional)', async () => {
  const { isValid } = await runValidators(submitRatingValidators, { stars: 5 });
  assert.equal(isValid, true);
});

test('rating accepts stars with a comment', async () => {
  const { isValid } = await runValidators(submitRatingValidators, {
    stars: 4,
    comment: 'Very gentle with the animal, arrived quickly.',
  });
  assert.equal(isValid, true);
});

test('transfer initiation rejects a malformed phone number', async () => {
  const { isValid } = await runValidators(initiateTransferValidators, { toPhone: 'abc' });
  assert.equal(isValid, false);
});

test('transfer initiation accepts a valid phone number', async () => {
  const { isValid } = await runValidators(initiateTransferValidators, { toPhone: '9876543210' });
  assert.equal(isValid, true);
});

test('transfer response rejects an invalid action', async () => {
  const { isValid, errors } = await runValidators(respondToTransferValidators, { action: 'MAYBE' });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'action'));
});

test('transfer response accepts ACCEPT, REJECT, and CANCEL', async () => {
  for (const action of ['ACCEPT', 'REJECT', 'CANCEL']) {
    const { isValid } = await runValidators(respondToTransferValidators, { action });
    assert.equal(isValid, true, `${action} should be valid`);
  }
});

test('change password rejects missing current password', async () => {
  const { isValid, errors } = await runValidators(changePasswordValidators, {
    newPassword: 'newsecret123',
  });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'currentPassword'));
});

test('change password rejects short new password', async () => {
  const { isValid, errors } = await runValidators(changePasswordValidators, {
    currentPassword: 'oldsecret123',
    newPassword: '123',
  });
  assert.equal(isValid, false);
  assert.ok(errors.some((e) => e.path === 'newPassword'));
});

test('change password accepts valid payload', async () => {
  const { isValid } = await runValidators(changePasswordValidators, {
    currentPassword: 'oldsecret123',
    newPassword: 'newsecret123',
  });
  assert.equal(isValid, true);
});
