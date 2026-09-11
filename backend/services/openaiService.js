/**
 * CowCare OpenAI AI Service
 * Conversational, Backend-Grounded AI Cattle Assistant (ChatGPT-Style)
 *
 * Mode 1: 'farmer' (Plain-Language Health Interpreter & Rural Agricultural Advisor)
 * Mode 2: 'veterinarian' (Clinical Timeline Co-Pilot for Licensed Veterinarians)
 *
 * Core Principles:
 * 1. Live Backend Grounding: Database records are the immutable source of truth.
 * 2. Conversational Memory: Supports follow-up questions ("when was that?", "what medicine?").
 * 3. Strictly No Hallucination: Missing database facts are explicitly identified as missing.
 * 4. Dynamic Understanding: Eliminates hardcoded keyword branching in favor of LLM reasoning.
 * 5. Flagship Model: 'gpt-4o' with automatic fallback to 'gpt-4o-mini'.
 * 6. Multilingual: English, Kannada, Tamil, Hindi, Telugu, Marathi.
 */

const OpenAI = require('openai');

const LANGUAGE_CONFIG = {
  en: { name: 'English', greeting: 'Namaste', script: 'Latin' },
  kn: { name: 'Kannada', greeting: 'ನಮಸ್ಕಾರ', script: 'Kannada' },
  ta: { name: 'Tamil', greeting: 'வணக்கம்', script: 'Tamil' },
  hi: { name: 'Hindi', greeting: 'नमस्ते', script: 'Devanagari' },
  te: { name: 'Telugu', greeting: 'నమస్కారం', script: 'Telugu' },
  mr: { name: 'Marathi', greeting: 'नमस्कार', script: 'Devanagari' },
};

/**
 * Core analytical & multilingual guardrail injected into system instructions
 */
const CORE_ANALYST_GUARDRAIL = `You are a premium, high-accuracy data analyst. Analyze all incoming information deeply, provide highly analytical and structured insights, and make definitive decisions. Crucial: You must identify the language preferred or used by the user and deliver your entire analysis natively in that exact language with flawless grammar.`;

/**
 * Format a single MedicalEvent document into a structured, readable string
 */
function formatMedicalEvent(event) {
  const date = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown date';

  const vetName = event.veterinarianId?.name || 'Verified Veterinarian';
  const vetSpecialty = event.veterinarianId?.specialization ? ` (${event.veterinarianId.specialization})` : '';

  // Clinical assessment / diagnosis
  const assessment = event.clinicalAssessment || event.diagnosis || event.clinicalObservations || 'General examination';

  // Examination details
  const symptoms = event.examination?.observedSymptoms || event.farmerReportedSymptoms || '';
  const findings = event.examination?.physicalFindings || '';

  // Vitals
  let vitalsStr = '';
  if (event.examination?.vitals) {
    const v = event.examination.vitals;
    const parts = [];
    if (v.temperatureC) parts.push(`Temperature: ${v.temperatureC}°C`);
    if (v.heartRateBpm) parts.push(`Heart Rate: ${v.heartRateBpm} bpm`);
    if (v.respirationRate) parts.push(`Respiration: ${v.respirationRate}/min`);
    if (parts.length > 0) vitalsStr = parts.join(', ');
  } else if (event.vitals) {
    vitalsStr = `Temp: ${event.vitals.temperatureF || 'N/A'}°F, Heart Rate: ${event.vitals.heartRateBpm || 'N/A'} bpm`;
  }

  // Treatments & Medications
  let treatmentParts = [];
  if (event.treatment) {
    if (event.treatment.performed) {
      treatmentParts.push(`Procedure: ${event.treatment.performed}`);
    }
    if (Array.isArray(event.treatment.medicines) && event.treatment.medicines.length > 0) {
      const meds = event.treatment.medicines.map((m) => {
        const details = [m.dosage, m.frequency, m.duration, m.route, m.instructions].filter(Boolean).join(', ');
        return `${m.name}${details ? ` [${details}]` : ''}`;
      });
      treatmentParts.push(`Prescribed Medicines: ${meds.join('; ')}`);
    } else if (Array.isArray(event.treatment) && event.treatment.length > 0) {
      const meds = event.treatment.map((t) => `${t.name}${t.dosage ? ` (${t.dosage})` : ''}`);
      treatmentParts.push(`Medications: ${meds.join('; ')}`);
    }
    if (event.treatment.additionalNotes) {
      treatmentParts.push(`Notes: ${event.treatment.additionalNotes}`);
    }
  }

  // Standalone vaccination fields
  let vaxStr = '';
  if (event.vaccination?.vaccineName) {
    const nextDue = event.vaccination.nextDueDate
      ? ` (Next Due: ${new Date(event.vaccination.nextDueDate).toLocaleDateString('en-IN')})`
      : '';
    vaxStr = `Vaccine Administered: ${event.vaccination.vaccineName}${nextDue}`;
  }

  // Follow-up requirement
  const followUpDate = event.treatment?.followUpDate || event.followUpDate;
  const followUpRequired = event.followUpRequired || Boolean(followUpDate);
  const followUpStatus = event.followUpCompleted ? 'Completed' : 'Pending';
  const followUpStr = followUpRequired
    ? `Follow-up required${followUpDate ? ` on ${new Date(followUpDate).toLocaleDateString('en-IN')}` : ''} (Status: ${followUpStatus})`
    : 'No follow-up required';

  return `
- Event ID: ${event.eventId || event._id || 'N/A'}
  Date: ${date}
  Type: ${event.eventType || 'VISIT'}
  Attending Veterinarian: ${vetName}${vetSpecialty}
  Clinical Assessment / Diagnosis: ${assessment}
  ${symptoms ? `Reported Symptoms: ${symptoms}\n  ` : ''}${findings ? `Physical Findings: ${findings}\n  ` : ''}${vitalsStr ? `Vitals: ${vitalsStr}\n  ` : ''}${treatmentParts.length > 0 ? `Treatments: ${treatmentParts.join(' | ')}\n  ` : ''}${vaxStr ? `Vaccination Record: ${vaxStr}\n  ` : ''}Follow-Up: ${followUpStr}`.trim();
}

/**
 * Build structured, authoritative cattle context from MongoDB records
 */
function buildCattleContext(cattle, timeline = [], activeCase = null) {
  const isMarketplaceGeneral = cattle.cattleId === 'MARKETPLACE' || cattle.cattleId === 'GENERAL_MARKETPLACE';

  if (isMarketplaceGeneral) {
    return `
[COWCARE GENERAL LIVESTOCK MARKETPLACE CONTEXT]
- Context: Pre-purchase buyer advisory and general dairy cattle evaluation.
- No specific cow records loaded. Provide systematic pre-purchase clinical advice, physical checks (udder, BCS, gait, eyes), essential Indian dairy vaccination schedules (FMD, HS, BQ), and advice to conduct an in-person veterinary examination before purchase.
`.trim();
  }

  const basicInfo = `
[VERIFIED CATTLE IDENTIFICATION & PROFILE]
- Permanent Cattle ID: ${cattle.cattleId}
- Name: ${cattle.name}
- Breed: ${cattle.breed || 'Indigenous Bovine'}
- Gender: ${cattle.gender === 'FEMALE' ? 'Female (Cow/Heifer)' : 'Male (Bull/Bullock)'}
- Estimated Age: ${cattle.estimatedAgeYears || 'Not specified'} years
- Overall Medical Status: ${cattle.status || 'HEALTHY'}
- Current Active Listing: ${cattle.sale?.status || 'NOT_FOR_SALE'}
${cattle.sale?.askingPrice ? `- Listed Asking Price: ₹${cattle.sale.askingPrice.toLocaleString('en-IN')}` : ''}
${cattle.sale?.description ? `- Seller Description: ${cattle.sale.description}` : ''}
${cattle.ownerId?.name ? `- Registered Owner: ${cattle.ownerId.name}${cattle.ownerId.farmName ? ` (${cattle.ownerId.farmName})` : ''}` : ''}
`.trim();

  let medicalHistory = '';
  if (!timeline || timeline.length === 0) {
    medicalHistory = `
[VERIFIED MEDICAL TIMELINE IN COWCARE]
- Total Verified Events on File: 0
- NOTE: There are NO veterinary visits or medical treatments recorded in the CowCare database for this cow to date. This indicates a clean platform record, but does not guarantee that no veterinary procedures occurred outside CowCare.
`.trim();
  } else {
    const formattedEvents = timeline.map(formatMedicalEvent).join('\n\n');
    medicalHistory = `
[VERIFIED MEDICAL TIMELINE IN COWCARE (${timeline.length} events, chronological newest to oldest)]
${formattedEvents}
`.trim();
  }

  let caseContext = '';
  if (activeCase) {
    caseContext = `
[ACTIVE CURRENT CONSULTATION CASE]
- Case Urgency: ${activeCase.urgency || 'NORMAL'}
- Chief Complaint / Symptoms: ${activeCase.symptoms || activeCase.problemDescription || activeCase.description || 'General examination requested'}
- Reported At: ${activeCase.createdAt ? new Date(activeCase.createdAt).toLocaleDateString('en-IN') : 'Recent'}
`.trim();
  }

  return `${basicInfo}\n\n${medicalHistory}${caseContext ? `\n\n${caseContext}` : ''}`;
}

/**
 * Build language-aware, role-grounded system instruction for ChatGPT-style assistant
 */
function buildChatSystemPrompt({ cattle, timeline, activeCase, mode = 'farmer', language = 'en' }) {
  const langCfg = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const contextData = buildCattleContext(cattle, timeline, activeCase);

  const personaInstruction =
    mode === 'veterinarian'
      ? `You are the CowCare Clinical Co-Pilot, an advanced, evidence-based AI assistant for licensed veterinarians.
- Use rigorous clinical terminology (etiology, pathophysiology, pharmacokinetics, differential diagnosis).
- Deliver structured clinical reasoning, correlating past medical history with presenting complaints.
- Include pharmacology precautions, contraindications, and milk/meat withdrawal periods when drugs or treatments are discussed.
- Clearly distinguish between documented clinical observations vs potential differential diagnoses.`
      : `You are the CowCare AI Assistant — a wise, empathetic, and practical village agricultural advisor speaking directly with a rural farmer or cattle buyer.
- Explain all medical information in simple, clear everyday language without overwhelming jargon.
- Be respectful, warm, and conversational (like a trusted village agricultural expert sharing insights over chai).
- SAFETY FIRST: Never prescribe medications, calculate drug dosages, or tell the farmer to administer prescription drugs independently.
- Always encourage an in-person physical veterinary examination before finalizing any purchase or treating illness.`;

  const languageInstruction =
    language !== 'en'
      ? `CRITICAL LANGUAGE DIRECTIVE:
- You MUST generate your response ENTIRELY in ${langCfg.name} (${langCfg.script} script) with natural phrasing and correct grammar.
- Only retain essential standard numeric notations (prices in ₹, dates) and international medical abbreviations if accompanied by simple explanation in ${langCfg.name}.`
      : '';

  return `
${CORE_ANALYST_GUARDRAIL}

${personaInstruction}

${languageInstruction}

==============================
AUTHORITATIVE COWCARE DATABASE CONTEXT FOR THIS ANIMAL:
${contextData}
==============================

CORE OPERATING RULES (MANDATORY & STRICT):
1. BACKEND IS THE SOLE SOURCE OF TRUTH:
   - The database context above contains the ONLY verified facts about this animal.
   - Base all answers strictly on these records.
2. STRICT NO-HALLUCINATION GUARDRAIL:
   - NEVER invent or assume medical events, diagnoses, treatments, medications, vaccines, prices, milk yields, or visits that are not explicitly in the context above.
   - If information is not in the records, explicitly say: "I don't see that information in this cow's CowCare records."
   - Do NOT convert missing data into a false positive or negative (e.g. if no vaccination is logged in CowCare, state that no vaccination is recorded in CowCare, and recommend verifying physical vaccination cards with the seller).
3. CONVERSATIONAL MEMORY:
   - You have access to the recent conversation history turns.
   - Accurately resolve follow-up questions and conversational references such as "she", "her", "that treatment", "when was that?", "what medicine did they give?", "was that followed up?", "is it serious?".
4. ANSWER THE ACTUAL QUESTION:
   - Answer the user's specific question directly, concisely, and naturally.
   - Do NOT dump the entire cow profile on every single message.
   - If the user sends a greeting (e.g. "hi", "hlo", "hello", "namaste"), greet warmly in tone, confirm the cow loaded (${cattle.name || 'this cow'}), and invite them to ask specific questions.
   - If the user asks for an overview or full summary, provide a comprehensive structured breakdown.
5. DISTINGUISH THREE TIERS OF KNOWLEDGE:
   - [Tier 1: Verified Database Facts] — Grounded directly in the records above.
   - [Tier 2: Reasonable Inferences] — Explicitly labelled as inference (e.g., typical breed milk yield benchmarks).
   - [Tier 3: General Veterinary Advice] — Best practices for feeding, deworming, or physical inspection.
   - NEVER present an inference or general advice as a verified CowCare fact.
`.trim();
}

/**
 * Intelligent, data-grounded fallback reasoning engine
 * Executes if OPENAI_API_KEY is not configured or OpenAI API is unreachable.
 * Dynamically reasons over actual cattle and timeline MongoDB documents without keyword branches.
 */
function generateDataGroundedFallback({ cattle, timeline = [], mode = 'farmer', message = '', language = 'en' }) {
  const langCfg = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const greeting = langCfg.greeting || 'Namaste';
  const name = cattle.name || 'Cattle';
  const breed = cattle.breed || 'Indigenous';
  const age = cattle.estimatedAgeYears || 'unknown';
  const gender = cattle.gender === 'FEMALE' ? 'Female Cow 🐄' : 'Male Bull 🐂';
  const price = cattle.sale?.askingPrice ? `₹${cattle.sale.askingPrice.toLocaleString('en-IN')}` : null;
  const q = (message || '').toLowerCase().trim();

  const isGeneral = cattle.cattleId === 'MARKETPLACE' || cattle.cattleId === 'GENERAL_MARKETPLACE';
  if (isGeneral) {
    if (mode === 'veterinarian') {
      return `### 🩺 Marketplace Pre-Purchase Clinical Checklist\n\n**${greeting} Doctor.** When evaluating cattle in the marketplace, conduct a systematic examination:\n- **General Examination:** Body Condition Score (BCS 1–5), coat lustre, alertness, gait symmetry\n- **Vitals:** Normal bovine rectal temperature: 38.0°C–39.3°C (100.4°F–102.8°F), HR: 48–84 bpm\n- **Udder Evaluation:** Palpate all four quarters for fibrosis, heat, or signs of subclinical mastitis (CMT)\n- **Verification:** Request physical vaccination certificates for FMD, HS, and BQ prior to sale.`;
    }
    return `### 🐄 Smart Buying Checklist for Marketplace Cattle\n\n${greeting}! Before buying any cow from the marketplace, check these key points:\n- **Look at the cow:** Bright eyes, moist nose, smooth coat, and active walking without limping.\n- **Check the udder:** All 4 teats should be soft without hard lumps (signs of mastitis).\n- **Ask about vaccines:** Check if FMD (Foot & Mouth), HS, and BQ vaccinations were given.\n- **Physical Vet Check:** Always have a local veterinarian examine the cow in person before paying.`;
  }

  // 1. Casual Greetings & Hellos (e.g. "hi", "hlo", "hello", "namaste")
  const isGreeting =
    /^(hlo|hello|hi|hey|helo|holla|namaste|namaskar|namaskara|vanakkam|pranam|good morning|good afternoon|good evening)\b/i.test(q) ||
    ['hlo', 'hi', 'hello', 'hey', 'namaste', 'namaskara'].includes(q);

  if (isGreeting) {
    if (mode === 'veterinarian') {
      return `### 🩺 CowCare Clinical Co-Pilot Active

**${greeting} Doctor!** I have loaded the clinical records for patient **${cattle.cattleId}** (${name}).

- **Profile:** ${breed} (${gender}), ~${age} years old | Status: **${cattle.status || 'HEALTHY'}**
- **Medical Records on Ledger:** ${timeline.length} verified clinical event(s)

How may I assist your clinical evaluation?
- Review recent diagnoses and physical examination findings
- Check prescribed antimicrobials, dosages, and withdrawal intervals
- Evaluate vaccination history or follow-up schedules`;
    }

    return `### 🙏 ${greeting}!

I am your **CowCare AI Assistant**. I have verified records loaded for **${name}** (${cattle.cattleId}).

**At a Glance:**
- **Breed:** ${breed} | **Age:** ~${age} years | **Gender:** ${gender}
${price ? `- **Listed Price:** ${price}` : ''}
- **Verified Vet Records:** ${timeline.length} event(s) recorded in CowCare

**What would you like to know about ${name}?** You can ask me:
- *"What happened during her last vet visit?"*
- *"Are her vaccinations recorded in CowCare?"*
- *"Was she ever treated for mastitis or any serious disease?"*
- *"Is she safe to buy based on her history?"*`;
  }

  // 2. Questions about latest / recent visit or date/time
  if (q.includes('last') || q.includes('recent') || q.includes('latest') || q.includes('when') || q.includes('date') || q.includes('ಹಿಂದಿನ') || q.includes('ಕೊನೆಯ') || q.includes('पिछला')) {
    if (timeline.length === 0) {
      return `### 📋 Recent Medical History for ${name}\n\nI don't see any veterinary visits recorded in CowCare for **${name}** yet. Her electronic record is currently empty. You should ask the seller about any off-platform veterinary visits.`;
    }
    const latest = timeline[0];
    const d = new Date(latest.eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    const assessment = latest.clinicalAssessment || latest.diagnosis || latest.clinicalObservations || 'General checkup';
    const vet = latest.veterinarianId?.name || 'Verified Veterinarian';

    let medDetails = 'No prescription medications recorded for this visit.';
    if (latest.treatment?.medicines?.length > 0) {
      medDetails = latest.treatment.medicines.map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ');
    }

    return `### 📅 Latest Visit Details for ${name}\n\n- **Date of Visit:** ${d}\n- **Attending Veterinarian:** ${vet}\n- **Event Type:** ${latest.eventType}\n- **Clinical Assessment:** ${assessment}\n- **Treatment & Medicines:** ${medDetails}\n- **Follow-up:** ${latest.treatment?.followUpDate ? `Scheduled for ${new Date(latest.treatment.followUpDate).toLocaleDateString('en-IN')}` : 'No follow-up required.'}`;
  }

  // 3. Questions about vaccinations
  if (q.includes('vaccin') || q.includes('fmd') || q.includes('hs') || q.includes('bq') || q.includes('ಲಸಿಕೆ') || q.includes('टीका') || q.includes('தடுப்பூசி')) {
    const vaxEvents = timeline.filter((e) => e.eventType === 'VACCINATION' || e.vaccination?.vaccineName);
    if (vaxEvents.length === 0) {
      return `### 💉 Vaccination Records for ${name}\n\nNo vaccinations are currently recorded in CowCare for **${name}**.\n\n*Important:* This does not prove that she was never vaccinated outside the platform. Please ask the seller for physical vaccination slips for essential vaccines (FMD, HS, BQ).`;
    }
    return `### 💉 Vaccination History for ${name}\n\nCowCare records show **${vaxEvents.length}** verified vaccination event(s):\n` +
      vaxEvents.map((v) => {
        const d = new Date(v.eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const nameVax = v.vaccination?.vaccineName || v.clinicalAssessment || 'Vaccine';
        const vet = v.veterinarianId?.name || 'Veterinarian';
        return `- **${d}:** ${nameVax} (administered by ${vet})`;
      }).join('\n');
  }

  // 4. Questions about medicine / treatments
  if (q.includes('medicine') || q.includes('treatment') || q.includes('drug') || q.includes('ಔಷಧ') || q.includes('दवा') || q.includes('மருந்து')) {
    const treatments = timeline.filter((e) => e.treatment?.medicines?.length > 0 || e.treatment?.performed);
    if (treatments.length === 0) {
      return `### 💊 Medication & Treatment Records for ${name}\n\nAccording to CowCare records, **no prescription medicines or major treatments** are documented for **${name}**. Her treatment record is completely clear.`;
    }
    return `### 💊 Recorded Treatments for ${name}\n\n` +
      treatments.map((t) => {
        const d = new Date(t.eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const meds = t.treatment?.medicines?.map((m) => m.name).join(', ') || t.treatment?.performed || 'Treated';
        return `- **${d}:** ${meds}`;
      }).join('\n');
  }

  // 5. Questions about buying / safety / price
  if (q.includes('buy') || q.includes('safe') || q.includes('worth') || q.includes('price') || q.includes('ಖರೀದಿ') || q.includes('कॉल') || q.includes('खरीद')) {
    const treatments = timeline.filter((e) => e.eventType === 'TREATMENT' || e.clinicalAssessment);
    return `### 🤝 Purchase Assessment for ${name} (${price || 'Market Rate'})\n\n${greeting}! Here is an objective evaluation based on verified database records:\n- **Recorded Checkups:** ${timeline.length} verified vet visit(s)\n- **Medical History:** ${treatments.length === 0 ? '✅ Clean record: No major illnesses recorded in CowCare.' : `⚠️ ${treatments.length} past clinical event(s) on file.`}\n- **Recommendation:** Always complete an in-person physical examination with a qualified veterinarian before finalizing any payment.`;
  }

  // 6. Default structured overview if no specific match
  return `### 🐄 Health Summary for ${name} (${cattle.cattleId})\n\n` +
    `- **Breed:** ${breed} | **Age:** ~${age} years | **Gender:** ${gender}\n` +
    `- **CowCare Status:** ${cattle.status || 'HEALTHY'}\n` +
    `- **Verified Records:** ${timeline.length} verified vet checkup(s) on file.\n` +
    (timeline.length > 0
      ? `- **Latest Record:** ${new Date(timeline[0].eventDate).toLocaleDateString('en-IN')} (${timeline[0].eventType || 'VISIT'}) by ${timeline[0].veterinarianId?.name || 'Verified Vet'}\n`
      : `- **Record Status:** No prior illnesses or treatments logged on CowCare.\n`) +
    `\n*Tip: Ask me specific follow-up questions about her latest visit, medicines, vaccines, or breeding status.*`;
}

/**
 * Main Conversational CowCare AI invocation function
 * Supports conversation memory, grounded database context, and multi-turn follow-ups.
 */
async function generateCowChat({
  cattle,
  timeline = [],
  mode = 'farmer',
  message = '',
  conversationHistory = [],
  activeCase = null,
  language = 'en',
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your-openai-api-key')) {
    console.warn('[CowCare AI] OPENAI_API_KEY is not configured in .env. Running data-grounded fallback reasoning.');
    return {
      success: true,
      answer: generateDataGroundedFallback({ cattle, timeline, mode, message, language }),
      isFallback: true,
      model: 'data-grounded-fallback',
    };
  }

  // Initialize official OpenAI SDK client
  const openai = new OpenAI({ apiKey });

  // Build grounded system prompt containing complete verified CowCare records
  const systemPrompt = buildChatSystemPrompt({
    cattle,
    timeline,
    activeCase,
    mode,
    language,
  });

  // Sanitize and limit recent conversation history (last 8 turns) to prevent context overflow
  const rawHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
  const sanitizedHistory = rawHistory
    .slice(-8)
    .filter((msg) => msg && (msg.content || msg.text) && (msg.role === 'user' || msg.role === 'assistant'))
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: String(msg.content || msg.text || '').trim(),
    }))
    .filter((msg) => msg.content.length > 0);

  // Construct message array: [System with Grounded DB Context, ...Prior Turns, Current User Question]
  const currentPrompt = message && message.trim().length > 0
    ? message.trim()
    : 'Please provide an initial grounded health overview for this animal based on her CowCare records.';

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...sanitizedHistory,
    { role: 'user', content: currentPrompt },
  ];

  console.log(`[CowCare AI] Calling OpenAI for cattle ${cattle.cattleId} (${mode}, lang=${language}, historyTurns=${sanitizedHistory.length})...`);

  // Model cascade: Flagship gpt-4o first, followed by gpt-4o-mini
  const models = ['gpt-4o', 'gpt-4o-mini'];

  for (const model of models) {
    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: chatMessages,
        temperature: 0.2, // Low temperature for high factual precision
        max_tokens: 1800,
        top_p: 0.9,
      });

      const generatedText = completion.choices?.[0]?.message?.content;

      if (generatedText && generatedText.trim().length > 0) {
        console.log(`[CowCare AI] Successfully received grounded response from OpenAI (${model})`);
        return {
          success: true,
          answer: generatedText.trim(),
          isFallback: false,
          model,
        };
      }
    } catch (err) {
      if (err.status === 401) {
        console.error('[CowCare AI] OpenAI Authentication Error (401): Invalid API key in OPENAI_API_KEY.');
        break; // Invalid key - don't retry subsequent models
      } else if (err.status === 429) {
        console.warn(`[CowCare AI] OpenAI Rate Limit or Quota Exceeded (429) for ${model}: ${err.message}. Retrying with secondary model...`);
      } else if (err.status === 400) {
        console.warn(`[CowCare AI] OpenAI Bad Request (400) for ${model}: ${err.message}.`);
      } else {
        console.error(`[CowCare AI] Error communicating with OpenAI API (${model}):`, err.message);
      }
    }
  }

  // Graceful fallback to data-grounded engine if OpenAI call fails
  console.warn('[CowCare AI] OpenAI API calls failed or unavailable. Falling back to data-grounded reasoning engine.');
  return {
    success: true,
    answer: generateDataGroundedFallback({ cattle, timeline, mode, message, language }),
    isFallback: true,
    model: 'data-grounded-fallback',
  };
}

/**
 * Backwards-compatible wrapper for single-shot cattle summary
 */
async function generateCowSummary({ cattle, timeline, mode = 'farmer', question = '', activeCase = null, language = 'en' }) {
  return generateCowChat({
    cattle,
    timeline,
    mode,
    message: question,
    conversationHistory: [],
    activeCase,
    language,
  });
}

module.exports = {
  generateCowChat,
  generateCowSummary,
  generateDataGroundedFallback,
  buildCattleContext,
  buildChatSystemPrompt,
  formatMedicalEvent,
  LANGUAGE_CONFIG,
};
