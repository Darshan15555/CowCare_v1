/**
 * CowCare Gemini AI Service
 * Server-side LLM integration for Dual-Mode Cattle Medical History Intelligence
 *
 * Mode 1: 'farmer' (Plain-Language Health Interpreter for Farmers & Prospective Buyers)
 * Mode 2: 'veterinarian' (Clinical Timeline Co-Pilot for Licensed Vets)
 */

/**
 * Build grounded context text from cattle profile and canonical medical events
 */
function buildCattleContext(cattle, timeline, activeCase = null) {
  const basicInfo = `
CATTLE IDENTIFICATION & PROFILE:
- Permanent Cattle ID: ${cattle.cattleId}
- Name: ${cattle.name}
- Breed: ${cattle.breed}
- Gender: ${cattle.gender}
- Estimated Age: ${cattle.estimatedAgeYears || 'Unknown'} years
- Current Status: ${cattle.status}
- Marketplace Status: ${cattle.sale?.status || 'NOT_FOR_SALE'}
${cattle.sale?.askingPrice ? `- Listed Asking Price: ₹${cattle.sale.askingPrice.toLocaleString()}` : ''}
${cattle.sale?.description ? `- Seller Description: ${cattle.sale.description}` : ''}
`;

  const medicalHistory =
    timeline.length === 0
      ? 'VERIFIED MEDICAL TIMELINE: No medical events recorded in the CowCare system to date.'
      : `VERIFIED MEDICAL TIMELINE (${timeline.length} recorded events, sorted newest to oldest):
` +
        timeline
          .map((event, idx) => {
            const date = new Date(event.eventDate).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const vetName = event.veterinarianId?.name || 'Verified Veterinarian';
            const vitals = event.vitals
              ? `[Vitals: Temp=${event.vitals.temperatureF || 'N/A'}°F, HeartRate=${event.vitals.heartRateBpm || 'N/A'}bpm, Resp=${event.vitals.respirationRateBpm || 'N/A'}]`
              : '';
            const treatments =
              event.treatment?.length > 0
                ? `Treatments/Meds: ${event.treatment.map((t) => `${t.name} (${t.dosage || 'standard dose'}, ${t.frequency || 'N/A'})`).join(', ')}`
                : 'No specific medications listed';
            const followUp = event.followUpRequired
              ? `Follow-up needed by: ${event.followUpDate ? new Date(event.followUpDate).toLocaleDateString() : 'N/A'}`
              : 'No follow-up required';

            return `[Event #${idx + 1}] Date: ${date}
- Type: ${event.eventType}
- Attending Vet: ${vetName}
- Diagnosis / Notes: ${event.diagnosis || event.clinicalObservations || 'Routine check/procedure'}
- ${vitals}
- ${treatments}
- ${followUp}
`;
          })
          .join('\n');

  let caseContext = '';
  if (activeCase) {
    caseContext = `
ACTIVE CURRENT CASE CONTEXT (Chief Complaint):
- Reason for Consultation: ${activeCase.symptoms || activeCase.description || 'General examination'}
- Urgency: ${activeCase.urgency || 'NORMAL'}
- Reported Since: ${activeCase.createdAt ? new Date(activeCase.createdAt).toLocaleDateString() : 'Today'}
`;
  }

  return `${basicInfo}\n${medicalHistory}\n${caseContext}`.trim();
}

/**
 * Deterministic fallback generator if GEMINI_API_KEY is not configured or service is unreachable
 */
function generateFallbackSummary(cattle, timeline, mode, question) {
  const eventCount = timeline.length;
  const recentEvents = timeline.slice(0, 3);

  if (mode === 'veterinarian') {
    let summary = `### Clinical Summary for ${cattle.cattleId} (${cattle.name || 'Cattle'})\n\n`;
    summary += `- **Record Volume:** ${eventCount} total documented medical events.\n`;
    summary += `- **Breed/Age/Status:** ${cattle.breed} | ~${cattle.estimatedAgeYears || '?'} yrs | ${cattle.status}\n\n`;

    if (eventCount === 0) {
      summary += `No prior clinical events or surgical interventions on record in CowCare.\n`;
    } else {
      summary += `**Recent Clinical History:**\n`;
      recentEvents.forEach((ev) => {
        const d = new Date(ev.eventDate).toLocaleDateString();
        summary += `- **${d} [${ev.eventType}]:** ${ev.diagnosis || 'Clinical visit'}. ${
          ev.treatment?.length > 0 ? `Rx: ${ev.treatment.map((t) => t.name).join(', ')}` : ''
        }\n`;
      });
    }
    summary += `\n*Note: Running in offline deterministic review mode.*`;
    return summary;
  }

  // Farmer / Buyer mode fallback
  let summary = `### Health Overview for ${cattle.name} (${cattle.cattleId})\n\n`;
  summary += `Hello! Here is a simple breakdown based on this cow's official CowCare records:\n\n`;
  summary += `- **Registered Information:** ${cattle.breed} (${cattle.gender}), approximately ${cattle.estimatedAgeYears || 'N/A'} years old.\n`;
  summary += `- **Health Record Status:** ${eventCount} verified veterinary visit${eventCount === 1 ? '' : 's'} on record.\n\n`;

  if (eventCount === 0) {
    summary += `There are currently no recorded illnesses or medical procedures logged by a veterinarian for this cow in the CowCare database.\n\n`;
  } else {
    summary += `**Recent Veterinary Care:**\n`;
    recentEvents.forEach((ev) => {
      const d = new Date(ev.eventDate).toLocaleDateString();
      summary += `- **${d}:** ${ev.eventType.replace(/_/g, ' ')} — ${ev.diagnosis || 'Routine checkup'}.\n`;
    });
    summary += `\n`;
  }

  summary += `**Buyer Consideration:** Always arrange an in-person physical examination with a qualified veterinarian before finalizing any cattle purchase.\n`;
  summary += `\n*Note: Instant overview prepared from verified medical records.*`;
  return summary;
}

/**
 * Main Gemini AI invocation function
 */
async function generateCowSummary({ cattle, timeline, mode = 'farmer', question = '', activeCase = null }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[CowCare AI] GEMINI_API_KEY is not configured in .env. Providing deterministic fallback.');
    return {
      success: true,
      answer: generateFallbackSummary(cattle, timeline, mode, question),
      isFallback: true,
    };
  }

  const contextData = buildCattleContext(cattle, timeline, activeCase);

  let systemInstruction = '';
  if (mode === 'veterinarian') {
    systemInstruction = `
You are the CowCare Clinical Co-Pilot, an AI veterinary assistant assisting licensed veterinarians.
Your role is to provide concise, accurate clinical summaries of cattle medical timelines.

RULES & CONSTRAINTS:
1. Professional veterinary terminology: Use standard clinical terms (e.g., mastitis, pyrexia, oxytetracycline).
2. Chronological & Categorical: Summarize past diagnoses, recurring pathologies, antimicrobials administered, and surgical procedures.
3. Case Correlation: If an ACTIVE CURRENT CASE CONTEXT is provided, highlight relevant past conditions or risk factors that correlate with current symptoms.
4. Strictly Grounded: Base all conclusions strictly on the provided CowCare records. If information is absent, state clearly that it is not on record.
5. Format: Use clean markdown with clear headings, bullet points, and high-signal clinical observations.
`.trim();
  } else {
    // Farmer / Buyer mode
    systemInstruction = `
You are the CowCare Health Interpreter, an AI assistant helping dairy farmers and prospective cattle buyers understand a cow's official medical history.

RULES & SAFETY CONSTRAINTS:
1. Plain, Simple Language: Explain medical events, illnesses, and vaccines in friendly, easy-to-understand terms suitable for rural farmers. Avoid overly complex medical jargon without explaining it.
2. Strictly Grounded: Answer ONLY based on the verified CowCare medical records provided below. NEVER invent, hallucinate, or assume medical events not present in the record.
3. NO Autonomous Diagnoses or Prescriptions: NEVER prescribe medications, calculate drug dosages, or recommend independent medical treatments.
4. Objective Purchasing Considerations: Do NOT issue direct "Buy" or "Do Not Buy" commands. Instead, provide factual points to consider (e.g., "Vaccinations are current", "Has had 2 recorded mastitis treatments in the past year").
5. Always remind the farmer that a physical veterinary inspection prior to purchase is strongly recommended.
6. Format: Use polite, encouraging, structured markdown with bullet points and bold highlights.
`.trim();
  }

  const userPrompt = question && question.trim().length > 0
    ? `User Question: "${question.trim()}"\n\nPlease answer this question using ONLY the cattle data and medical timeline below:\n\n${contextData}`
    : `Please generate a comprehensive medical history summary for this cattle using the records below:\n\n${contextData}`;

  // Call Gemini REST API (gemini-2.0-flash with gemini-1.5-flash and gemini-2.5-flash)
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2, // Low temperature for high factual grounding
              topP: 0.8,
              maxOutputTokens: 1200,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`[CowCare AI] Model ${model} returned HTTP ${response.status}: ${errorBody}`);
        continue; // Try next model
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        return {
          success: true,
          answer: generatedText,
          isFallback: false,
          model,
        };
      }
    } catch (err) {
      console.error(`[CowCare AI] Error communicating with Gemini API (${model}):`, err.message);
    }
  }

  // If all Gemini calls fail, use graceful fallback
  console.warn('[CowCare AI] Gemini API calls failed. Falling back to deterministic summary.');
  return {
    success: true,
    answer: generateFallbackSummary(cattle, timeline, mode, question),
    isFallback: true,
  };
}

module.exports = {
  generateCowSummary,
  generateFallbackSummary,
  buildCattleContext,
};
