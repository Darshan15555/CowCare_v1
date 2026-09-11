/**
 * Validates cattle marketplace sale status transitions.
 * Ensures the state machine cannot be bypassed by client requests.
 */
const ALLOWED_SALE_TRANSITIONS = {
  NOT_FOR_SALE: ['OPEN_FOR_SALE'],
  OPEN_FOR_SALE: ['SALE_PENDING', 'SOLD', 'NOT_FOR_SALE', 'REMOVED_FROM_SALE'],
  SALE_PENDING: ['SOLD', 'OPEN_FOR_SALE', 'NOT_FOR_SALE', 'REMOVED_FROM_SALE'],
  REMOVED_FROM_SALE: ['OPEN_FOR_SALE', 'NOT_FOR_SALE'],
  SOLD: [], // Terminal for this listing cycle
};

const VALID_SALE_STATUSES = Object.keys(ALLOWED_SALE_TRANSITIONS);

function isValidSaleStatus(status) {
  return VALID_SALE_STATUSES.includes(status);
}

function canTransitionSale(currentStatus, nextStatus) {
  if (!currentStatus) currentStatus = 'NOT_FOR_SALE';
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_SALE_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

module.exports = {
  ALLOWED_SALE_TRANSITIONS,
  VALID_SALE_STATUSES,
  isValidSaleStatus,
  canTransitionSale,
};
