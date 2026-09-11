const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildCattleContext,
  generateDataGroundedFallback,
  generateCowChat,
  generateCowSummary,
  buildChatSystemPrompt,
  formatMedicalEvent,
} = require('../services/openaiService');

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
  ownerId: {
    name: 'Ramesh Patel',
    farmName: 'Surabhi Dairy',
  },
};

const mockTimeline = [
  {
    eventId: 'ME-000001',
    eventDate: new Date('2025-06-15'),
    eventType: 'VACCINATION',
    clinicalAssessment: 'Routine FMD and Brucellosis booster administered.',
    veterinarianId: { name: 'Dr. Ramesh Sharma', specialization: 'Bovine Medicine' },
    vaccination: { vaccineName: 'FMD Vaccine', nextDueDate: new Date('2025-12-15') },
    treatment: { performed: 'Subcutaneous injection', followUpDate: null },
  },
  {
    eventId: 'ME-000002',
    eventDate: new Date('2025-01-10'),
    eventType: 'TREATMENT',
    clinicalAssessment: 'Mild subclinical mastitis in left rear quarter.',
    veterinarianId: { name: 'Dr. Ramesh Sharma', specialization: 'Bovine Medicine' },
    examination: {
      observedSymptoms: 'Swelling in rear left teat',
      vitals: { temperatureC: 38.6, heartRateBpm: 68 },
    },
    treatment: {
      performed: 'Quarter infusion',
      medicines: [{ name: 'Intramammary Infusion', dosage: '1 tube', frequency: 'Daily' }],
      followUpDate: new Date('2025-01-15'),
    },
    followUpRequired: true,
  },
];

test('formatMedicalEvent extracts clinical assessment, medicines, and vitals accurately', () => {
  const formatted = formatMedicalEvent(mockTimeline[1]);
  assert.match(formatted, /ME-000002/);
  assert.match(formatted, /Mild subclinical mastitis/);
  assert.match(formatted, /Intramammary Infusion/);
  assert.match(formatted, /Temperature: 38.6°C/);
  assert.match(formatted, /Dr. Ramesh Sharma/);
});

test('buildCattleContext formats basic info, marketplace, and timeline accurately', () => {
  const context = buildCattleContext(mockCattle, mockTimeline);
  assert.match(context, /CW-IND-24-000101/);
  assert.match(context, /Gauri/);
  assert.match(context, /Gir/);
  assert.match(context, /₹55,000/);
  assert.match(context, /FMD Vaccine/);
  assert.match(context, /mastitis/);
});

test('buildCattleContext handles empty timeline gracefully with explicit missing-data note', () => {
  const context = buildCattleContext(mockCattle, []);
  assert.match(context, /Total Verified Events on File: 0/);
  assert.match(context, /clean platform record/);
});

test('buildChatSystemPrompt enforces no-hallucination and grounded rules', () => {
  const prompt = buildChatSystemPrompt({
    cattle: mockCattle,
    timeline: mockTimeline,
    mode: 'farmer',
    language: 'en',
  });
  assert.match(prompt, /BACKEND IS THE SOLE SOURCE OF TRUTH/);
  assert.match(prompt, /STRICT NO-HALLUCINATION GUARDRAIL/);
  assert.match(prompt, /I don't see that information in this cow's CowCare records/);
  assert.match(prompt, /CONVERSATIONAL MEMORY/);
});

test('generateDataGroundedFallback handles greetings like "hlo" with conversational tone and cow introduction', () => {
  const farmerGreeting = generateDataGroundedFallback({
    cattle: mockCattle,
    timeline: mockTimeline,
    mode: 'farmer',
    message: 'hlo',
  });
  assert.match(farmerGreeting, /CowCare AI Assistant/);
  assert.match(farmerGreeting, /Gauri/);
  assert.match(farmerGreeting, /Gir/);

  const vetGreeting = generateDataGroundedFallback({
    cattle: mockCattle,
    timeline: mockTimeline,
    mode: 'veterinarian',
    message: 'hi doctor',
  });
  assert.match(vetGreeting, /CowCare Clinical Co-Pilot/);
  assert.match(vetGreeting, /Doctor/);
  assert.match(vetGreeting, /CW-IND-24-000101/);
});

test('generateDataGroundedFallback dynamically answers questions about the latest visit', () => {
  const visitAnswer = generateDataGroundedFallback({
    cattle: mockCattle,
    timeline: mockTimeline,
    mode: 'farmer',
    message: 'What happened during her last visit?',
  });
  assert.match(visitAnswer, /Latest Visit Details for Gauri/);
  assert.match(visitAnswer, /15 Jun 2025/);
  assert.match(visitAnswer, /VACCINATION/);
});

test('generateDataGroundedFallback answers vaccination question directly', () => {
  const vaxAnswer = generateDataGroundedFallback({
    cattle: mockCattle,
    timeline: mockTimeline,
    mode: 'farmer',
    message: 'What vaccinations are recorded?',
  });
  assert.match(vaxAnswer, /Vaccination History for Gauri/);
  assert.match(vaxAnswer, /FMD Vaccine/);
});

test('generateCowChat executes multi-turn conversational request safely', async () => {
  const result = await generateCowChat({
    cattle: mockCattle,
    timeline: mockTimeline,
    mode: 'farmer',
    message: 'When was that?',
    conversationHistory: [
      { role: 'user', content: 'What was her last illness?' },
      { role: 'assistant', content: 'She was treated for mild mastitis.' },
    ],
  });
  assert.equal(result.success, true);
  assert.ok(result.answer && result.answer.length > 20);
});

test('generateCowSummary backwards-compatible wrapper functions properly', async () => {
  const result = await generateCowSummary({
    cattle: mockCattle,
    timeline: mockTimeline,
    mode: 'farmer',
    question: 'Tell me about her health',
  });
  assert.equal(result.success, true);
  assert.ok(result.answer && result.answer.length > 20);
});
