const test = require('node:test');
const assert = require('node:assert/strict');
const { isVetOnDutyNow } = require('../utils/vetAvailability');

test('vet with no schedule is on duty whenever isAvailable is true (backward compatible)', () => {
  const vet = { isAvailable: true, weeklySchedule: [] };
  assert.equal(isVetOnDutyNow(vet, new Date('2026-09-01T03:00:00')), true); // 3 AM, no schedule
});

test('vet is off duty if the manual toggle is off, regardless of schedule', () => {
  const vet = {
    isAvailable: false,
    weeklySchedule: [{ dayOfWeek: 2, isWorking: true, startTime: '00:00', endTime: '23:59' }],
  };
  const tuesday = new Date('2026-09-01T12:00:00'); // a Tuesday
  assert.equal(isVetOnDutyNow(vet, tuesday), false);
});

test('vet is off duty on a day marked isWorking: false', () => {
  const sunday = new Date('2026-08-30T12:00:00'); // a Sunday, dayOfWeek 0
  const vet = {
    isAvailable: true,
    weeklySchedule: [{ dayOfWeek: 0, isWorking: false, startTime: '09:00', endTime: '18:00' }],
  };
  assert.equal(isVetOnDutyNow(vet, sunday), false);
});

test('vet is on duty within their scheduled hours', () => {
  const tuesday2pm = new Date('2026-09-01T14:00:00');
  const vet = {
    isAvailable: true,
    weeklySchedule: [{ dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '18:00' }],
  };
  assert.equal(isVetOnDutyNow(vet, tuesday2pm), true);
});

test('vet is off duty outside their scheduled hours', () => {
  const tuesday9pm = new Date('2026-09-01T21:00:00');
  const vet = {
    isAvailable: true,
    weeklySchedule: [{ dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '18:00' }],
  };
  assert.equal(isVetOnDutyNow(vet, tuesday9pm), false);
});

test('vet with a schedule but no entry for today defaults to off duty', () => {
  const wednesday = new Date('2026-09-02T14:00:00'); // dayOfWeek 3, no entry provided
  const vet = {
    isAvailable: true,
    weeklySchedule: [{ dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '18:00' }],
  };
  assert.equal(isVetOnDutyNow(vet, wednesday), false);
});

test('boundary: exactly at start and end time counts as on duty (inclusive)', () => {
  const vet = {
    isAvailable: true,
    weeklySchedule: [{ dayOfWeek: 2, isWorking: true, startTime: '09:00', endTime: '18:00' }],
  };
  assert.equal(isVetOnDutyNow(vet, new Date('2026-09-01T09:00:00')), true);
  assert.equal(isVetOnDutyNow(vet, new Date('2026-09-01T18:00:00')), true);
  assert.equal(isVetOnDutyNow(vet, new Date('2026-09-01T08:59:00')), false);
  assert.equal(isVetOnDutyNow(vet, new Date('2026-09-01T18:01:00')), false);
});
