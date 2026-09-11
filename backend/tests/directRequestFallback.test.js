const test = require('node:test');
const assert = require('node:assert/strict');
const { isDirectRequestFallbackEligible } = require('../utils/directRequestFallback');

test('direct request becomes eligible only after expiry while still unclaimed', () => {
  const now = new Date('2026-09-06T12:00:00Z');
  const base = { status: 'REQUESTED', requestedVeterinarianId: 'vet-id', directRequestFallbackAt: null, directRequestExpiresAt: new Date('2026-09-06T11:59:59Z') };
  assert.equal(isDirectRequestFallbackEligible(base, now), true);
  assert.equal(isDirectRequestFallbackEligible({ ...base, directRequestExpiresAt: new Date('2026-09-06T12:00:01Z') }, now), false);
  assert.equal(isDirectRequestFallbackEligible({ ...base, directRequestFallbackAt: now }, now), false);
  assert.equal(isDirectRequestFallbackEligible({ ...base, status: 'ACCEPTED' }, now), false);
});
