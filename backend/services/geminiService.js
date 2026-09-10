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
 * Intelligent dynamic question analyzer for offline / fallback mode.
 * Answers specific queries about milk, vaccines, diseases, feeding, pregnancy, etc.
 */
function answerDynamicQuestion(question, cattle, timeline, mode, language = 'en') {
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return null;
  }

  const q = question.toLowerCase().trim();
  const lang = LANGUAGE_CONFIG[language] ? language : 'en';
  const greeting = LANGUAGE_CONFIG[lang]?.greeting || 'Namaste';
  const name = cattle.name || 'Cattle';
  const breed = cattle.breed || 'Indigenous';
  const gender = cattle.gender === 'FEMALE' ? 'Female Cow 🐄' : 'Male Bull 🐂';
  const age = cattle.estimatedAgeYears || 4;
  const isFemale = cattle.gender === 'FEMALE';

  // 1. MILK YIELD & PRODUCTION
  if (q.includes('milk') || q.includes('yield') || q.includes('dairy') || q.includes('ಹಾಲು') || q.includes('பால்') || q.includes('दूध') || q.includes('పాలు')) {
    if (!isFemale) {
      return `### 🥛 Milk Production Query — ${name}\n\n${greeting}! **${name}** is registered as a **male bull/bullock**. Milk yield is not applicable for male animals. Bulls are utilized for breeding, draught purposes, or farming labor.`;
    }

    const pastMastitis = timeline.filter((e) => (e.diagnosis || '').toLowerCase().includes('mastitis') || (e.clinicalObservations || '').toLowerCase().includes('mastitis'));

    let breedYield = '10 – 14 Liters/day';
    if (breed.toLowerCase().includes('gir')) breedYield = '12 – 16 Liters/day';
    else if (breed.toLowerCase().includes('sahiwal')) breedYield = '14 – 18 Liters/day';
    else if (breed.toLowerCase().includes('red sindhi')) breedYield = '12 – 15 Liters/day';
    else if (breed.toLowerCase().includes('hf') || breed.toLowerCase().includes('holstein')) breedYield = '20 – 30 Liters/day';
    else if (breed.toLowerCase().includes('jersey')) breedYield = '15 – 22 Liters/day';
    else if (breed.toLowerCase().includes('murrah')) breedYield = '14 – 20 Liters/day';

    return `### 🥛 Milk Yield & Lactation Analysis — ${name} (${breed})

${greeting}! Here is the specific milk production analysis for **${name}**:

- **Breed Benchmark:** Purebred ${breed} cows typically yield approximately **${breedYield}** under optimal nutrition and management.
- **Udder & Teat Health:** ${pastMastitis.length > 0 ? `⚠️ **Attention:** There are ${pastMastitis.length} past mastitis event(s) recorded. Inspect all four teats carefully before purchase to ensure no quarter is blind or fibrosed.` : `✅ **Clear:** No past mastitis or teat infections documented on CowCare ledger.`}
- **Peak Lactation Advice:** Highest milk yield occurs between 40 to 70 days post-calving.
- **Nutrition for Higher Yield:**
  - Provide 1 kg of balanced concentrate feed for every 2.5–3 liters of milk produced.
  - Include 25–30 kg of green fodder (Napier/Co-4, Maize) + 5 kg dry straw daily.
  - Mix 50g of quality mineral mixture + 30g salt daily to prevent milk fever and maintain fat percentage.
- **Seller Verification:** Always request the seller to demonstrate at least two consecutive morning and evening milkings in your presence.`;
  }

  // 2. VACCINATION & DISEASE SCHEDULE
  if (q.includes('vaccin') || q.includes('fmd') || q.includes('hs') || q.includes('bq') || q.includes('brucell') || q.includes('lumpy') || q.includes('ಲಸಿಕೆ') || q.includes('தடுப்பூசி') || q.includes('टीका') || q.includes('టీకా')) {
    const vaxEvents = timeline.filter((e) => e.eventType === 'VACCINATION');

    return `### 💉 Vaccination & Immunization Status — ${name}

${greeting}! Here is the detailed vaccination analysis for **${name}**:

- **Recorded Vaccinations on CowCare:** ${vaxEvents.length} verified vaccination(s).
${vaxEvents.length > 0 ? vaxEvents.map((v) => `  - ${new Date(v.eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}: ${v.treatment?.[0]?.name || v.clinicalObservations || 'Vaccine administered'} (by ${v.veterinarianId?.name || 'Verified Vet'})`).join('\n') : '  - ⚠️ No vaccinations currently logged in the electronic registry. Always verify physical records with the seller.'}

**Essential Annual Indian Dairy Cattle Vaccination Schedule:**
1. **FMD (Foot and Mouth Disease / ಕಾಲುಬಾಯಿ ರೋಗ):** Given every 6 months (September & March).
2. **HS (Haemorrhagic Septicaemia / ಘಟಸರ್ಪ):** Annual pre-monsoon dose (May – June).
3. **BQ (Black Quarter / ಕಪ್ಪುಕಾಲಿನ ರೋಗ):** Annual pre-monsoon dose (May – June).
4. **Brucellosis (ಬ್ರೂಸೆಲ್ಲೋಸಿಸ್):** Once in lifetime for female calves (4–8 months of age).
5. **Deworming (ಹುಳು ನಿವಾರಣೆ):** Administer Albendazole or Fenbendazole every 3–4 months.`;
  }

  // 3. MASTITIS & UDDER HEALTH
  if (q.includes('mastitis') || q.includes('udder') || q.includes('teat') || q.includes('ಮಡಿ') || q.includes('ಕೆಚ್ಚಲು') || q.includes('थनेला') || q.includes('రొమ్ము')) {
    const mastitisEvents = timeline.filter((e) => (e.diagnosis || '').toLowerCase().includes('mastitis') || (e.clinicalObservations || '').toLowerCase().includes('mastitis'));

    if (mode === 'veterinarian') {
      return `### 🩺 Clinical Protocol: Bovine Mastitis Assessment & Management

**Patient:** ${cattle.cattleId} (${name}) | **Breed:** ${breed}
**Historical Ledger:** ${mastitisEvents.length} recorded mastitis episode(s).

**Diagnostic & Treatment Protocol:**
1. **California Mastitis Test (CMT):** Score each quarter (Negative, Trace, 1, 2, 3).
2. **Clinical Signs:** Auscultate for systemic pyrexia, evaluate local heat, pain, edema, and milk consistency (clots, flakes, serous).
3. **Antimicrobial Therapy:**
   - Intramammary: Cephalosporin (e.g., Cefquinome) or Cloxacillin infusion after thorough quarter evacuation.
   - Systemic (if pyrexic/acute): Ceftiofur sodium (1.1-2.2 mg/kg IM) or Enrofloxacin (5 mg/kg SC/IM).
4. **Anti-inflammatory:** Flunixin meglumine (2.2 mg/kg IV) or Meloxicam (0.5 mg/kg IM) to reduce endotoxin-induced tissue necrosis.
5. **Milk Withdrawal:** Strictly observe 72–96 hr withdrawal period before human consumption.`;
    }

    return `### 🩺 Udder Health & Mastitis Guide for ${name}

${greeting}! Mastitis (ಕೆಚ್ಚಲು ಬಾವು / थनेला) is an inflammation of the udder teats. Here is the evaluation for **${name}**:

- **CowCare Records:** ${mastitisEvents.length > 0 ? `⚠️ **Attention:** ${name} has had ${mastitisEvents.length} previous treatment(s) for mastitis on record. Inspect carefully.` : `✅ **Clean Record:** No prior mastitis treatments recorded.`}
- **Early Signs to Inspect:**
  - Swollen, hard, or unusually hot teat quarter.
  - Watery, yellowish milk, or visible white flakes/clots in the first few milk streams.
  - Cow shows discomfort or kicks when touched.
- **Prevention Best Practices:**
  - Strip the first 2-3 streams of milk into a strip cup before milking.
  - After milking, dip all 4 teats in 0.5% povidone-iodine teat dip solution.
  - Keep the shed floor clean and dry; do not let the cow sit immediately after milking (feed green fodder to keep her standing for 30 minutes).`;
  }

  // 4. RESPIRATORY DISEASE / COUGH / FEVER
  if (q.includes('respirat') || q.includes('cough') || q.includes('fever') || q.includes('brd') || q.includes('temperature') || q.includes('ಜ್ವರ') || q.includes('காய்ச்சல்') || q.includes('बुखार') || q.includes('జ్వరం')) {
    if (mode === 'veterinarian') {
      return `### 🩺 Bovine Respiratory Disease (BRD) Clinical Guidance

**Patient:** ${cattle.cattleId} (${name})

**Differential Diagnosis & Management Protocol:**
1. **Etiological Differentials:** *Mannheimia haemolytica*, *Pasteurella multocida*, *Histophilus somni*, BRSV, IBR (Bovine Herpesvirus-1).
2. **Physical Evaluation:** Auscultate cranioventral lung fields for crackles/wheezes. Assess rectal temperature (pyrexia > 103.5°F).
3. **Primary Antimicrobial Protocol:**
   - Florfenicol (20 mg/kg IM q48h, or 40 mg/kg SC once).
   - Tulathromycin (2.5 mg/kg SC single injection) for extended macrolide coverage.
4. **Adjunctive NSAID:** Meloxicam (0.5 mg/kg IM/SC) or Flunixin meglumine (2.2 mg/kg IV).
5. **Supportive Care:** Isolate in well-ventilated, draught-free pen with fresh water.`;
    }

    return `### 🌡️ Fever & Respiratory Care for ${name}

${greeting}! Here is important advice regarding fever and breathing symptoms:

- **Normal Temperature Range:** A healthy cow has a body temperature of **100.4°F to 102.8°F** (38°C to 39.3°C).
- **Warning Signs:**
  - Dry, warm muzzle (a healthy cow always has a moist, cool muzzle).
  - Rapid breathing, coughing, or nasal discharge.
  - Dull eyes, drooping ears, and stopped rumination (chewing cud).
- **Immediate Action:**
  - Place the cow in a clean, shaded, well-ventilated area.
  - Provide cool, clean drinking water.
  - **Book a verified vet visit immediately on CowCare** — do not administer human medicines like paracetamol without a veterinary prescription.`;
  }

  // 5. PREGNANCY, CALVING & BREEDING
  if (q.includes('pregnant') || q.includes('calv') || q.includes('heat') || q.includes('breeding') || q.includes('ai') || q.includes('semen') || q.includes('ಗರ್ಭ') || q.includes('கர்ப்பம்') || q.includes('गाभिन') || q.includes('గర్భం')) {
    if (!isFemale) {
      return `### 🐂 Breeding Guide — ${name}\n\n${greeting}! **${name}** is a male animal. For breeding bulls, ensure regular semen evaluation, high-protein feed, and testing for reproductive pathogens (Brucellosis, Trichomoniasis).`;
    }

    return `### 🐄 Pregnancy & Breeding Guide for ${name} (${breed})

${greeting}! Here are key facts regarding breeding, pregnancy, and calving for **${name}**:

- **Gestation Period:** Average pregnancy duration is **283 days (~9 months and 9 days)**.
- **Detecting Heat (ಕಾಮದ ಲಕ್ಷಣಗಳು):**
  - Restlessness, frequent bellowing, mounting other cattle or standing when mounted.
  - Clear, transparent, rope-like mucus discharge from the vulva.
  - Drop in milk yield and reduced appetite.
- **Optimal Insemination (A.I.) Timing — AM-PM Rule:**
  - If heat is observed in the morning → Inseminate in the evening.
  - If heat is observed in the evening → Inseminate the next morning.
- **Dry Cow Care:** Stop milking 60 days prior to expected calving to allow the udder to regenerate and produce high-quality colostrum for the newborn calf.`;
  }

  // 6. FEEDING & NUTRITION
  if (q.includes('feed') || q.includes('fodder') || q.includes('grass') || q.includes('diet') || q.includes('silage') || q.includes('ಆಹಾರ') || q.includes('ಮೇವು') || q.includes('தீவனம்') || q.includes('चारा') || q.includes('మేత')) {
    return `### 🌿 Balanced Daily Feeding Plan for ${name} (~${age} yrs, ${breed})

${greeting}! To keep **${name}** healthy and maintain high productivity, follow this balanced dairy ration:

1. **Green Fodder (ಹಸಿರು ಮೇವು / हरा चारा):** 25 – 35 kg daily (Hybrid Napier, CO-4, Maize, Sorghum, or Berseem).
2. **Dry Fodder (ಒಣ ಮೇವು / सूखा चारा):** 4 – 6 kg daily (Paddy straw, Ragi straw, or Wheat straw) to provide essential dietary fiber.
3. **Concentrate Cattle Feed (ಹಿಂಡಿ / दाना मिश्रण):**
   - **Maintenance:** 1.5 kg daily for body weight maintenance.
   - **Milk Production:** Add 400g of concentrate for every liter of milk produced.
4. **Minerals & Salts:**
   - 50g quality mineral mixture daily (essential for fertility, strong hooves, and disease immunity).
   - 30g common iodized salt daily.
5. **Fresh Clean Water:** 60 – 90 liters of fresh water available at all times.`;
  }

  // 7. DRUG DOSAGES & WITHDRAWAL PERIODS (VET MODE)
  if (mode === 'veterinarian' && (q.includes('dose') || q.includes('dosage') || q.includes('withdrawal') || q.includes('antibiotic') || q.includes('pharmac'))) {
    return `### 💊 Bovine Clinical Pharmacopeia & Withdrawal Guide

**Patient:** ${cattle.cattleId} (${name})

| Medication | Clinical Dosage & Route | Indication | Milk Withdrawal | Meat Withdrawal |
|---|---|---|---|---|
| **Meloxicam** | 0.5 mg/kg IM/SC/IV | Anti-inflammatory, Pyrexia | 5 Days | 15 Days |
| **Flunixin Meglumine** | 2.2 mg/kg IV | Acute endotoxemia, Mastitis | 36 Hours | 4 Days |
| **Oxytetracycline (LA)** | 20 mg/kg deep IM | Anaplasmosis, Pneumonia, Foot rot | 7 Days | 28 Days |
| **Ceftiofur Sodium** | 1.1 – 2.2 mg/kg IM/SC | BRD, Acute Metritis, Foot rot | **0 Hours (Zero)** | 4 Days |
| **Enrofloxacin** | 5 mg/kg SC/IM | Coliform mastitis, Enteritis | 84 Hours | 14 Days |
| **Ivermectin** | 0.2 mg/kg SC | Endoparasites & Ectoparasites | **Do not use in lactating** | 35 Days |`;
  }

  // 8. GENERAL SMART RESPONSE
  return `### 💡 Analysis for your question: "${question}"

${greeting}! Here is the specific insight regarding **${name}** (${cattle.cattleId}):

- **Animal Profile:** ${breed} | ${gender} | ~${age} years old | Status: **${cattle.status}**
- **Verified Health Record:** ${timeline.length} clinical event(s) logged by licensed veterinarians on CowCare.
- **Key Observation:** ${timeline.length === 0 ? 'This animal has a completely clean CowCare ledger with no major medical events recorded.' : `Latest event was on ${new Date(timeline[0].eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })} (${timeline[0].eventType}) by ${timeline[0].veterinarianId?.name || 'Veterinarian'}.`}
- **Health Tip:** Ensure regular deworming every 90 days and maintain bi-annual FMD vaccinations to protect cattle productivity.`;
}

/**
 * Deterministic fallback generator if GEMINI_API_KEY is not configured or service is unreachable.
 * Designed to give genuinely useful, analysed information — not just raw data dumps.
 */
function generateFallbackSummary(cattle, timeline, mode, question, language = 'en') {
  const eventCount = timeline.length;
  const recentEvents = timeline.slice(0, 5);

  // If a specific question was asked, generate dynamic tailored analysis first!
  const dynamicAnswer = answerDynamicQuestion(question, cattle, timeline, mode, language);

  // ── GENERAL MARKETPLACE MODE (no specific cow) ──
  if (cattle.cattleId === 'MARKETPLACE') {
    if (dynamicAnswer) {
      return dynamicAnswer;
    }

    if (mode === 'veterinarian') {
      return `### 🩺 Clinical Advisory — Marketplace Pre-Purchase Evaluation

When evaluating cattle for purchase, perform a systematic clinical examination:

- **General Condition:** Body condition score (BCS 1-5), coat quality, alertness, gait symmetry
- **Vital Signs:** Temperature (normal: 100.4-103.1°F), heart rate (40-80 bpm), respiration (10-30 bpm)
- **Eyes & Mucous Membranes:** Check for pallor (anaemia), icterus (liver issues), conjunctivitis
- **Udder Examination:** Palpate all four quarters for fibrosis, heat, swelling (mastitis indicators)
- **Reproductive History:** Calving history, inter-calving interval, any dystocia or retained placenta
- **Lameness Assessment:** Watch the animal walk — check for digital dermatitis, sole ulcers, hoof overgrowth
- **Respiratory:** Auscultate lungs bilaterally for crackles, wheezes (BRD indicators)
- **Lymph Nodes:** Palpate prescapular and prefemoral nodes for enlargement

**Request from seller:** Vaccination records, deworming schedule, last FMD/HS/BQ vaccination date, any recent antibiotic use.`;
    }

    return `### 🐄 Buying Cattle? Here's Your Smart Checklist!

Namaste! Before you purchase any cow from the marketplace, here are the important things to check:

**👀 What to Look For:**
- Is the cow active and alert? Dull or lazy behaviour may mean illness
- Check the coat — it should be smooth and shiny, not rough or patchy
- Watch her walk — she should walk straight without limping
- Look at the eyes — they should be bright and clear, not watery or pale
- Check the udder — all four teats should be soft, no hard lumps (sign of mastitis)

**📋 Questions to Ask the Seller:**
- When was the last vaccination done? (FMD, HS, BQ are essential)
- Has the cow had any major illness or surgery?
- How many calves has she given? Any difficult deliveries?
- What is the daily milk yield?
- Has she been dewormed recently?

**💉 Check the CowCare Records:**
- Cows with verified CowCare health records are safer to buy
- Look for regular vet visits and up-to-date vaccinations
- Check if any past mastitis or reproductive issues are recorded

**⚠️ Important:** Always have a qualified veterinarian examine the cow in person before finalizing the purchase. No online record can replace a physical examination.`;
  }

  // ── VET MODE: Specific Cow Analysis ──
  if (mode === 'veterinarian') {
    let summary = `### 📋 Clinical Summary for ${cattle.cattleId} (${cattle.name})\n\n`;
    summary += `**Patient Profile:** ${cattle.breed} | ${cattle.gender === 'FEMALE' ? 'Female' : 'Male'} | ~${cattle.estimatedAgeYears || '?'} years | Status: ${cattle.status}\n\n`;

    if (eventCount === 0) {
      summary += `**Clinical History:** No prior medical events documented in CowCare. This is a clean record — no known pathology, but also no vaccination documentation.\n\n`;
      summary += `**Recommendation:** Perform baseline physical examination. Check vaccination status (FMD, HS, BQ). Establish deworming schedule.\n`;
    } else {
      const vaccinations = timeline.filter((e) => e.eventType === 'VACCINATION');
      const treatments = timeline.filter((e) => e.eventType === 'TREATMENT');
      const visits = timeline.filter((e) => e.eventType === 'VISIT');

      summary += `**Record Summary:** ${eventCount} events — ${vaccinations.length} vaccination(s), ${treatments.length} treatment(s), ${visits.length} visit(s)\n\n`;
      summary += `**Recent Clinical History:**\n`;
      recentEvents.forEach((ev) => {
        const d = new Date(ev.eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const vetName = ev.veterinarianId?.name || 'Verified Vet';
        summary += `- **${d} [${ev.eventType}]** by ${vetName}: ${ev.diagnosis || ev.clinicalObservations || 'Routine visit'}`;
        if (ev.treatment?.length > 0) {
          summary += ` | Rx: ${ev.treatment.map((t) => `${t.name}${t.dosage ? ` (${t.dosage})` : ''}`).join(', ')}`;
        }
        summary += `\n`;
      });
    }

    if (dynamicAnswer) {
      return `${dynamicAnswer}\n\n---\n\n${summary}`;
    }
    return summary;
  }

  // ── FARMER MODE: Specific Cow Analysis (Plain Language) ──
  let summary = `### 🐄 Health Overview for ${cattle.name}\n\n`;

  if (cattle.sale?.askingPrice) {
    summary += `**Price:** ₹${cattle.sale.askingPrice.toLocaleString('en-IN')} | `;
  }
  summary += `**Breed:** ${cattle.breed} | **Age:** ~${cattle.estimatedAgeYears || '?'} years | **Gender:** ${cattle.gender === 'FEMALE' ? 'Female Cow 🐄' : 'Male Bull 🐂'}\n\n`;

  if (eventCount === 0) {
    summary += `**Health Records:** This cow has no veterinary visits recorded in CowCare yet.\n\n`;
    summary += `This doesn't mean the cow is unhealthy — it just means no vet has logged any visits through this platform yet.\n\n`;
    summary += `**What you should do:**\n`;
    summary += `- Ask the seller about vaccination history (FMD, HS, BQ)\n`;
    summary += `- Ask if she's been dewormed recently\n`;
    summary += `- Check her physical health — eyes, coat, udder, gait\n`;
  } else {
    const vaccinations = timeline.filter((e) => e.eventType === 'VACCINATION');
    const treatments = timeline.filter((e) => e.eventType === 'TREATMENT');

    // Health status
    if (treatments.length > 0) {
      summary += `⚠️ **Note:** This cow has had ${treatments.length} treatment(s) for health issues. Check the details below carefully.\n\n`;
    } else {
      summary += `✅ **Good Sign:** No treatments for major illnesses on record.\n\n`;
    }

    summary += `**Health Records:** ${eventCount} verified vet visit(s) on record\n\n`;

    // Vaccinations
    if (vaccinations.length > 0) {
      summary += `**💉 Vaccinations (${vaccinations.length}):**\n`;
      vaccinations.slice(0, 3).forEach((v) => {
        const d = new Date(v.eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const name = v.treatment?.[0]?.name || v.clinicalObservations || 'Vaccine';
        summary += `- ${d}: ${name}\n`;
      });
      summary += `\n`;
    } else {
      summary += `⚠️ **No vaccinations recorded** — Ask the seller if vaccinations were done by a local vet outside CowCare.\n\n`;
    }

    // Past illnesses
    if (treatments.length > 0) {
      summary += `**🩺 Past Health Issues & Treatments:**\n`;
      treatments.slice(0, 3).forEach((t) => {
        const d = new Date(t.eventDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const condition = t.diagnosis || t.clinicalObservations || 'Treated';
        const rx = t.treatment?.[0]?.name ? ` — ${t.treatment[0].name}` : '';
        summary += `- ${d}: ${condition}${rx}\n`;
      });
      summary += `\n`;
    }

    // Follow-ups needed
    const pendingFollowUps = timeline.filter((e) => e.followUpRequired && !e.followUpCompleted);
    if (pendingFollowUps.length > 0) {
      summary += `**📅 Follow-ups Needed:** ${pendingFollowUps.length} follow-up visit(s) pending — ask the seller if these were completed.\n\n`;
    }
  }

  summary += `\n**Buyer Consideration:**`;
  summary += `\n⚠️ **Remember:** Always complete an in-person physical examination with a qualified veterinarian before buying any cattle.`;

  if (dynamicAnswer) {
    return `${dynamicAnswer}\n\n---\n\n${summary}`;
  }
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
    console.warn('[CowCare AI] GEMINI_API_KEY is not configured in .env. Providing intelligent dynamic analysis.');
    return {
      success: true,
      answer: generateFallbackSummary(cattle, timeline, mode, question, language),
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

  // Call Gemini REST API (gemini-2.0-flash with gemini-1.5-flash and gemini-1.5-pro)
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      console.log(`[CowCare AI] Calling Gemini (${model}) for ${mode} query...`);
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
        console.log(`[CowCare AI] Successfully received response from ${model}`);
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
  console.warn('[CowCare AI] Gemini API calls failed. Falling back to intelligent dynamic analysis.');
  return {
    success: true,
    answer: generateFallbackSummary(cattle, timeline, mode, question, language),
    isFallback: true,
  };
}

module.exports = {
  generateCowSummary,
  generateFallbackSummary,
  buildCattleContext,
  LANGUAGE_CONFIG,
};
