const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCattleContext,
  generateFallbackSummary,
} = require('../services/geminiService');

const mockCattle = {
  _id: '64e8b021a3b1234567890123',
  cattleId: 'CW-IND-24-000101',
  name: 'Gauri',
  breed: 'Gir',
  gender: 'FEMALE',
  status: 'HEALTHY',
  estimatedAgeYears: 4,
  sale: {
    status: 'OPEN_FOR_SALE',
    askingPrice: 55000,
    description: 'High-yield Gir cow with regular milk production.',
  },
};

const mockTimeline = [
  {
    eventDate: new Date('2025-06-15'),
    eventType: 'VACCINATION',
    diagnosis: 'Routine FMD and Brucellosis booster administered.',
    veterinarianId: { name: 'Dr. Ramesh Sharma', specialization: 'Bovine Medicine' },
    treatment: [{ name: 'FMD Vaccine', dosage: '2ml', frequency: 'Annual' }],
    followUpRequired: false,
  },
  {
    eventDate: new Date('2025-01-10'),
    eventType: 'TREATMENT',
    diagnosis: 'Mild subclinical mastitis in left rear quarter.',
    veterinarianId: { name: 'Dr. Ramesh Sharma', specialization: 'Bovine Medicine' },
    treatment: [{ name: 'Intramammary Infusion', dosage: '1 tube', frequency: 'OD for 3 days' }],
    followUpRequired: true,
    followUpDate: new Date('2025-01-15'),
  },
];

test('buildCattleContext formats basic info and timeline accurately', () => {
  const context = buildCattleContext(mockCattle, mockTimeline);
  assert.match(context, /CW-IND-24-000101/);
  assert.match(context, /Gauri/);
  assert.match(context, /Gir/);
  assert.match(context, /₹55,000/);
  assert.match(context, /FMD Vaccine/);
  assert.match(context, /mastitis/);
});

test('buildCattleContext handles empty timeline gracefully', () => {
  const context = buildCattleContext(mockCattle, []);
  assert.match(context, /No medical events recorded/);
});

test('generateFallbackSummary produces friendly structured markdown for farmer mode', () => {
  const summary = generateFallbackSummary(mockCattle, mockTimeline, 'farmer', 'Is vaccination current?');
  assert.match(summary, /Health Overview for Gauri/);
  assert.match(summary, /Buyer Consideration/);
  assert.match(summary, /physical examination with a qualified veterinarian/);
});

test('generateFallbackSummary produces clinical summary for veterinarian mode', () => {
  const summary = generateFallbackSummary(mockCattle, mockTimeline, 'veterinarian', 'Summarize past mastitis');
  assert.match(summary, /Clinical Summary for CW-IND-24-000101/);
  assert.match(summary, /Recent Clinical History/);
  assert.match(summary, /mastitis/);
});
