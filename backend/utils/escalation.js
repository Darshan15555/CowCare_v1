const VetRequest = require('../models/VetRequest');
const User = require('../models/User');
const { isVetOnDutyNow } = require('./vetAvailability');

const ESCALATION_THRESHOLD_MINUTES = Number(process.env.EMERGENCY_ESCALATION_MINUTES) || 10;

/**
 * Finds EMERGENCY requests that have sat unaccepted past the threshold and
 * escalates them:
 *  - re-notifies all currently on-duty vets with elevated urgency
 *  - also notifies off-duty vets who've opted into emergency override
 *  - lets the farmer know their request is taking longer than expected
 *  - flags the request (escalatedAt) so admin can see it and it isn't
 *    escalated repeatedly on every sweep
 *
 * Takes `notifyUser` and `getIO` as parameters rather than requiring the
 * request controller directly, to avoid a circular require between the
 * controller and this module.
 */
async function runEscalationSweep({ notifyUser, getIO }) {
  const cutoff = new Date(Date.now() - ESCALATION_THRESHOLD_MINUTES * 60 * 1000);

  const staleEmergencies = await VetRequest.find({
    priority: 'EMERGENCY',
    status: 'REQUESTED',
    escalatedAt: null,
    createdAt: { $lte: cutoff },
  });

  if (staleEmergencies.length === 0) return { escalated: 0 };

  const allVets = await User.find({ role: 'VETERINARIAN', isActive: true });
  const onDutyVets = allVets.filter((v) => isVetOnDutyNow(v));
  const offDutyOverrideVets = allVets.filter((v) => !isVetOnDutyNow(v) && v.acceptsEmergencyOverride);
  const escalationTargets = [...onDutyVets, ...offDutyOverrideVets];

  const io = getIO();

  for (const request of staleEmergencies) {
    await Promise.all(
      escalationTargets.map((vet) =>
        notifyUser({
          userId: vet._id,
          type: 'NEW_REQUEST',
          title: '🔴 ESCALATED — Emergency needs attention',
          message: `${request.cattleNameSnapshot} (${request.cattleIdSnapshot}) has been waiting ${ESCALATION_THRESHOLD_MINUTES}+ minutes for a vet. ${request.problemDescription}`,
          priority: 'EMERGENCY',
          requestId: request._id,
          cattleId: request.cattleId,
        })
      )
    );

    // Let the farmer know honestly that this is taking longer than expected,
    // rather than leaving them wondering in silence.
    await notifyUser({
      userId: request.farmerId,
      type: 'STATUS_UPDATE',
      title: 'Still finding a vet for your emergency',
      message: `We've widened the search — ${escalationTargets.length} veterinarian${
        escalationTargets.length === 1 ? '' : 's'
      } just got an urgent alert about ${request.cattleNameSnapshot}.`,
      priority: 'EMERGENCY',
      requestId: request._id,
      cattleId: request.cattleId,
    });

    request.escalatedAt = new Date();
    request.escalationNotifiedCount = escalationTargets.length;
    request.statusHistory.push({
      status: request.status,
      note: `Escalated after ${ESCALATION_THRESHOLD_MINUTES} min unaccepted — ${escalationTargets.length} vet(s) re-notified.`,
    });
    await request.save();

    if (io) {
      io.to(`request:${request._id}`).emit('requestEscalated', { requestId: request._id });
    }
  }

  return { escalated: staleEmergencies.length };
}

module.exports = { runEscalationSweep, ESCALATION_THRESHOLD_MINUTES };
