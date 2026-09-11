const DIRECT_REQUEST_FALLBACK_MINUTES = Number(process.env.DIRECT_REQUEST_FALLBACK_MINUTES) || 15;

function isDirectRequestFallbackEligible(request, now = new Date()) {
  return Boolean(
    request &&
      request.status === 'REQUESTED' &&
      request.requestedVeterinarianId &&
      !request.directRequestFallbackAt &&
      request.directRequestExpiresAt &&
      new Date(request.directRequestExpiresAt) <= now
  );
}

async function runDirectRequestFallbackSweep({ VetRequest, broadcastRequestToOnDutyVets, notifyUser }) {
  const pending = await VetRequest.find({ status: 'REQUESTED', requestedVeterinarianId: { $ne: null }, directRequestFallbackAt: null, directRequestExpiresAt: { $lte: new Date() } });
  let broadcast = 0;
  for (const pendingRequest of pending) {
    if (!isDirectRequestFallbackEligible(pendingRequest)) continue;
    const request = await VetRequest.findOneAndUpdate(
      { _id: pendingRequest._id, status: 'REQUESTED', requestedVeterinarianId: pendingRequest.requestedVeterinarianId, directRequestFallbackAt: null },
      { $set: { requestedVeterinarianId: null, directRequestFallbackAt: new Date() } }, { new: true }
    );
    if (!request) continue;
    const count = await broadcastRequestToOnDutyVets(request, true);
    request.directRequestFallbackNotifiedCount = count;
    request.notifiedVeterinarianCount += count;
    request.statusHistory.push({ status: 'REQUESTED', note: `Direct request timed out; broadcast to ${count} on-duty vet(s).` });
    await request.save();
    await notifyUser({ userId: request.farmerId, type: 'STATUS_UPDATE', title: 'Finding another veterinarian', message: `Your selected veterinarian did not respond. We notified ${count} available veterinarian${count === 1 ? '' : 's'} about ${request.cattleNameSnapshot}.`, priority: request.priority, requestId: request._id, cattleId: request.cattleId });
    broadcast += 1;
  }
  return { broadcast };
}

module.exports = { DIRECT_REQUEST_FALLBACK_MINUTES, isDirectRequestFallbackEligible, runDirectRequestFallbackSweep };
