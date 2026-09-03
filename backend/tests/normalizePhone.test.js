const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone } = require('../utils/normalizePhone');

test('strips internal spaces', () => {
  assert.equal(normalizePhone('98765 43210'), '9876543210');
});

test('strips dashes', () => {
  assert.equal(normalizePhone('98765-43210'), '9876543210');
});

test('strips parentheses and mixed formatting', () => {
  assert.equal(normalizePhone('(987) 654-3210'), '9876543210');
});

test('preserves a leading plus for country codes', () => {
  assert.equal(normalizePhone('+91 98765 43210'), '+919876543210');
});

test('registration and login formatting variants normalize to the same value', () => {
  // This is the exact scenario that caused the lockout bug: same phone,
  // typed differently at registration vs. login.
  const registeredAs = normalizePhone('98765 43210');
  const typedAtLogin = normalizePhone('9876543210');
  assert.equal(registeredAs, typedAtLogin);
});

test('already-clean numbers pass through unchanged', () => {
  assert.equal(normalizePhone('9876543210'), '9876543210');
});

test('handles null/undefined/empty gracefully', () => {
  assert.equal(normalizePhone(null), null);
  assert.equal(normalizePhone(undefined), undefined);
  assert.equal(normalizePhone(''), '');
});
