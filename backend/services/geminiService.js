/**
 * CowCare Gemini AI Service
 * Server-side LLM integration for Dual-Mode Cattle Medical History Intelligence
 *
 * Mode 1: 'farmer' (Plain-Language Health Interpreter for Farmers & Prospective Buyers)
 * Mode 2: 'veterinarian' (Clinical Timeline Co-Pilot for Licensed Vets)
 *
 * Supports multilingual output: English, Kannada, Tamil, Hindi, Telugu, Marathi
 */

const LANGUAGE_CONFIG = {
  en: { name: 'English', greeting: 'Namaste', script: 'Latin' },
  kn: { name: 'Kannada', greeting: 'ನಮಸ್ಕಾರ', script: 'Kannada' },
  ta: { name: 'Tamil', greeting: 'வணக்கம்', script: 'Tamil' },
  hi: { name: 'Hindi', greeting: 'नमस्ते', script: 'Devanagari' },
  te: { name: 'Telugu', greeting: 'నమస్కారం', script: 'Telugu' },
  mr: { name: 'Marathi', greeting: 'नमस्कार', script: 'Devanagari' },
};

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
  let summary = `### 🐄 ${cattle.name} - Health Overview\n\n`;
  summary += `Hello! Here's a simple breakdown of this cow's official CowCare records:\n\n`;
  summary += `- **Breed:** ${cattle.breed} (${cattle.gender === 'FEMALE' ? 'Female Cow' : 'Male Bull'})\n`;
  summary += `- **Age:** Approximately ${cattle.estimatedAgeYears || 'N/A'} years old\n`;
  summary += `- **Health Records:** ${eventCount} verified veterinary visit${eventCount === 1 ? '' : 's'} on record\n\n`;

  if (eventCount === 0) {
    summary += `📋 No recorded illnesses or medical procedures have been logged for this cow yet.\n\n`;
  } else {
    summary += `**Recent Veterinary Care:**\n`;
    recentEvents.forEach((ev) => {
      const d = new Date(ev.eventDate).toLocaleDateString();
      summary += `- 📅 **${d}:** ${ev.eventType.replace(/_/g, ' ')} — ${ev.diagnosis || 'Routine checkup'}\n`;
    });
    summary += `\n`;
  }

  summary += `⚠️ **Important:** Always arrange an in-person physical examination with a qualified veterinarian before finalizing any cattle purchase.\n`;
  summary += `\n*Instant overview prepared from verified medical records.*`;
  return summary;
}

/**
 * Build language-aware system instruction for the farmer mode
 */
function buildFarmerSystemInstruction(language = 'en') {
  const langCfg = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const isNonEnglish = language !== 'en';

  const languageDirective = isNonEnglish
    ? `
LANGUAGE REQUIREMENT (CRITICAL):
- You MUST respond ENTIRELY in ${langCfg.name} (${langCfg.script} script).
- Use natural, everyday ${langCfg.name} that a rural farmer would understand.
- Do NOT mix English words unnecessarily. Only use English for technical/medical terms that have no common ${langCfg.name} equivalent, and always explain them in ${langCfg.name} immediately after.
- Numbers, dates, and prices can remain in standard format (₹, digits).
- Use ${langCfg.name} greetings and cultural context.
`
    : '';

  return `
You are the CowCare AI Health Assistant — think of yourself as a wise, experienced, and caring village veterinary expert who is sitting next to the farmer and explaining things warmly, like a knowledgeable friend.

${languageDirective}

YOUR PERSONALITY & TONE:
1. **Warm and Personal**: Address the farmer by feeling, not formally. Use conversational tone as if you're explaining to a fellow farmer over chai. Be encouraging, not alarming.
2. **Expert but Simple**: You know cattle health deeply, but you explain it the way an experienced farmer would — using analogies, practical examples, and everyday language. Avoid medical jargon unless you immediately explain it in simple words.
3. **Structured yet Natural**: Use emoji (🐄 ✅ ⚠️ 💉 🩺 📋 💪 🌿) to make information scannable. Use bullet points and bold text for key facts, but weave them into a natural narrative.
4. **Actionable Advice**: Don't just list facts — tell the farmer what to look for, what questions to ask the vet, what signs to watch for, and practical next steps.
5. **Culturally Aware**: Reference Indian dairy farming context — monsoon seasons, local breeds, common regional diseases, local feeding practices when relevant.

SAFETY RULES (NON-NEGOTIABLE):
1. **Strictly Grounded**: Answer ONLY based on the verified CowCare medical records provided. NEVER invent or hallucinate medical events not in the records.
2. **NO Prescriptions**: NEVER prescribe medications, calculate dosages, or recommend treatments independently. Always say "consult your local veterinarian".
3. **NO Buy/Don't Buy Commands**: For marketplace queries, present factual health points to consider, but let the farmer decide. Frame as "things to consider" not directives.
4. **Physical Exam Reminder**: Always gently remind that a physical vet inspection is recommended before any purchase.

FORMAT:
- Start with a friendly greeting and the cow's name
- Give an overall health impression first (is the cow generally healthy, well-cared for?)
- Then break down specifics: vaccination status, past illnesses, treatments, follow-ups
- End with practical advice or "things to watch for"
- Keep responses detailed but readable — aim for the quality of a knowledgeable person explaining, not a computer generating a report
`.trim();
}

/**
 * Main Gemini AI invocation function
 */
async function generateCowSummary({ cattle, timeline, mode = 'farmer', question = '', activeCase = null, language = 'en' }) {
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
    // Farmer / Buyer mode — multilingual, warm, expert
    systemInstruction = buildFarmerSystemInstruction(language);
  }

  const userPrompt = question && question.trim().length > 0
    ? `User Question: "${question.trim()}"\n\nPlease answer this question using ONLY the cattle data and medical timeline below:\n\n${contextData}`
    : `Please generate a comprehensive, friendly health summary for this cattle using the records below:\n\n${contextData}`;

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
              temperature: 0.35, // Slightly warmer for natural language while staying grounded
              topP: 0.85,
              maxOutputTokens: 2000,
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
  LANGUAGE_CONFIG,
};
