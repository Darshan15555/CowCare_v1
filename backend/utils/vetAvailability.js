/**
 * Determines whether a veterinarian is currently on duty, combining:
 *  - the manual `isAvailable` toggle (a quick override — e.g. "off for lunch"
 *    even during otherwise-scheduled hours)
 *  - their recurring `weeklySchedule`, if they've set one up
 *
 * Backward compatible: a vet with no weeklySchedule configured is on duty
 * whenever `isAvailable` is true, exactly like before this feature existed.
 */
function isVetOnDutyNow(vet, now = new Date()) {
  if (!vet.isAvailable) return false;
  if (!vet.weeklySchedule || vet.weeklySchedule.length === 0) return true;

  const dayEntry = vet.weeklySchedule.find((d) => d.dayOfWeek === now.getDay());
  if (!dayEntry || !dayEntry.isWorking) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = dayEntry.startTime.split(':').map(Number);
  const [endH, endM] = dayEntry.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

module.exports = { isVetOnDutyNow };
