/**
 * Defines every legal status transition for a VetRequest.
 * Any transition not listed here must be rejected by the controller.
 *
 *  REQUESTED -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> IN_PROGRESS -> COMPLETED
 *  REQUESTED -> REJECTED
 *  REQUESTED -> CANCELLED
 *  ACCEPTED  -> CANCELLED
 */
const ALLOWED_TRANSITIONS = {
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['ON_THE_WAY', 'CANCELLED'],
  ON_THE_WAY: ['ARRIVED'],
  ARRIVED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

/**
 * Which role is permitted to perform a given transition.
 * ADMIN is always allowed as an operational override.
 */
const TRANSITION_ROLES = {
  ACCEPTED: ['VETERINARIAN'],
  REJECTED: ['VETERINARIAN'],
  ON_THE_WAY: ['VETERINARIAN'],
  ARRIVED: ['VETERINARIAN'],
  IN_PROGRESS: ['VETERINARIAN'],
  COMPLETED: ['VETERINARIAN'],
  CANCELLED: ['FARMER', 'VETERINARIAN'],
};

function isTransitionAllowed(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

function isRoleAllowedForTransition(nextStatus, role) {
  if (role === 'ADMIN') return true;
  const roles = TRANSITION_ROLES[nextStatus] || [];
  return roles.includes(role);
}

module.exports = {
  ALLOWED_TRANSITIONS,
  isTransitionAllowed,
  isRoleAllowedForTransition,
};
