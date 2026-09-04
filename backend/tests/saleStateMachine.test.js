const test = require('node:test');
const assert = require('node:assert/strict');
const {
  VALID_SALE_STATUSES,
  canTransitionSale,
  isValidSaleStatus,
} = require('../utils/saleStateMachine');

test('validates valid sale status strings', () => {
  for (const status of VALID_SALE_STATUSES) {
    assert.equal(isValidSaleStatus(status), true);
  }
  assert.equal(isValidSaleStatus('INVALID_STATUS'), false);
  assert.equal(isValidSaleStatus(''), false);
  assert.equal(isValidSaleStatus(null), false);
});

test('allows happy path: NOT_FOR_SALE -> OPEN_FOR_SALE -> SALE_PENDING -> SOLD', () => {
  assert.equal(canTransitionSale('NOT_FOR_SALE', 'OPEN_FOR_SALE'), true);
  assert.equal(canTransitionSale('OPEN_FOR_SALE', 'SALE_PENDING'), true);
  assert.equal(canTransitionSale('SALE_PENDING', 'SOLD'), true);
});

test('allows direct sale from OPEN_FOR_SALE to SOLD', () => {
  assert.equal(canTransitionSale('OPEN_FOR_SALE', 'SOLD'), true);
});

test('allows removing listing from OPEN_FOR_SALE or SALE_PENDING', () => {
  assert.equal(canTransitionSale('OPEN_FOR_SALE', 'REMOVED_FROM_SALE'), true);
  assert.equal(canTransitionSale('OPEN_FOR_SALE', 'NOT_FOR_SALE'), true);
  assert.equal(canTransitionSale('SALE_PENDING', 'OPEN_FOR_SALE'), true);
  assert.equal(canTransitionSale('SALE_PENDING', 'NOT_FOR_SALE'), true);
  assert.equal(canTransitionSale('SALE_PENDING', 'REMOVED_FROM_SALE'), true);
});

test('allows relisting from REMOVED_FROM_SALE or NOT_FOR_SALE', () => {
  assert.equal(canTransitionSale('REMOVED_FROM_SALE', 'OPEN_FOR_SALE'), true);
  assert.equal(canTransitionSale('REMOVED_FROM_SALE', 'NOT_FOR_SALE'), true);
});

test('terminal SOLD state does not allow transitioning back without ownership transfer event', () => {
  for (const next of ['OPEN_FOR_SALE', 'SALE_PENDING', 'REMOVED_FROM_SALE']) {
    assert.equal(canTransitionSale('SOLD', next), false, `SOLD -> ${next} should be blocked`);
  }
});

test('rejects transitions from unknown status', () => {
  assert.equal(canTransitionSale('UNKNOWN_STATUS', 'OPEN_FOR_SALE'), false);
  assert.equal(canTransitionSale('NOT_FOR_SALE', 'INVALID_STATUS'), false);
});
