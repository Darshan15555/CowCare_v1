const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isTransitionAllowed,
  isRoleAllowedForTransition,
} = require('../utils/requestStateMachine');

test('allows the full happy-path progression', () => {
  assert.equal(isTransitionAllowed('REQUESTED', 'ACCEPTED'), true);
  assert.equal(isTransitionAllowed('ACCEPTED', 'ON_THE_WAY'), true);
  assert.equal(isTransitionAllowed('ON_THE_WAY', 'ARRIVED'), true);
  assert.equal(isTransitionAllowed('ARRIVED', 'IN_PROGRESS'), true);
  assert.equal(isTransitionAllowed('IN_PROGRESS', 'COMPLETED'), true);
});

test('allows rejection only from REQUESTED', () => {
  assert.equal(isTransitionAllowed('REQUESTED', 'REJECTED'), true);
  assert.equal(isTransitionAllowed('ACCEPTED', 'REJECTED'), false);
  assert.equal(isTransitionAllowed('IN_PROGRESS', 'REJECTED'), false);
});

test('allows cancellation only from REQUESTED or ACCEPTED', () => {
  assert.equal(isTransitionAllowed('REQUESTED', 'CANCELLED'), true);
  assert.equal(isTransitionAllowed('ACCEPTED', 'CANCELLED'), true);
  assert.equal(isTransitionAllowed('ON_THE_WAY', 'CANCELLED'), false);
  assert.equal(isTransitionAllowed('COMPLETED', 'CANCELLED'), false);
});

test('rejects skipping stages (e.g. REQUESTED straight to ARRIVED)', () => {
  assert.equal(isTransitionAllowed('REQUESTED', 'ARRIVED'), false);
  assert.equal(isTransitionAllowed('REQUESTED', 'IN_PROGRESS'), false);
  assert.equal(isTransitionAllowed('REQUESTED', 'COMPLETED'), false);
});

test('terminal states allow no further transitions', () => {
  for (const terminal of ['COMPLETED', 'REJECTED', 'CANCELLED']) {
    for (const next of ['REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']) {
      assert.equal(isTransitionAllowed(terminal, next), false, `${terminal} -> ${next} should be blocked`);
    }
  }
});

test('unknown current status has no allowed transitions', () => {
  assert.equal(isTransitionAllowed('NOT_A_REAL_STATUS', 'ACCEPTED'), false);
});

test('role gating: only veterinarians (or admin) can accept/reject/progress', () => {
  assert.equal(isRoleAllowedForTransition('ACCEPTED', 'VETERINARIAN'), true);
  assert.equal(isRoleAllowedForTransition('ACCEPTED', 'FARMER'), false);
  assert.equal(isRoleAllowedForTransition('COMPLETED', 'VETERINARIAN'), true);
  assert.equal(isRoleAllowedForTransition('COMPLETED', 'FARMER'), false);
});

test('role gating: both farmer and vet can cancel', () => {
  assert.equal(isRoleAllowedForTransition('CANCELLED', 'FARMER'), true);
  assert.equal(isRoleAllowedForTransition('CANCELLED', 'VETERINARIAN'), true);
});

test('role gating: admin can always perform any transition (operational override)', () => {
  assert.equal(isRoleAllowedForTransition('ACCEPTED', 'ADMIN'), true);
  assert.equal(isRoleAllowedForTransition('REJECTED', 'ADMIN'), true);
  assert.equal(isRoleAllowedForTransition('COMPLETED', 'ADMIN'), true);
});
