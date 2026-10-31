import type {
  AssistantChatRequest,
  AssistantChatResponse,
  HealthCondition,
  PollutantMetrics,
  UserHealthProfile,
} from '@vaayuvision/shared';

const CONDITION_GUIDELINES: Record<HealthCondition, { thresholdAqi: number; thresholdPm25: number; guidance: string }> = {
  Asthma: {
    thresholdAqi: 100,
    thresholdPm25: 35,
    guidance:
      'High bronchial hyper-reactivity to fine PM2.5, NO2 traffic exhaust, and firework sulfur/metal fumes. Recommend carrying a fast-acting bronchodilator (rescue inhaler), wearing a fit-tested N95/FFP2 respirator above AQI 120, and strictly avoiding outdoor running when PM2.5 > 45 µg/m³ or NO2 > 40 µg/m³.',
  },
  'Chronic Obstructive Pulmonary Disease (COPD)': {
    thresholdAqi: 90,
    thresholdPm25: 30,
    guidance:
      'Severe risk of acute exacerbation and hypoxia under elevated PM2.5/PM10. Recommend staying indoors with HEPA filtration when AQI > 100, avoiding any outdoor exertion, monitoring pulse oximetry (SpO2), and keeping nebulizer/maintenance inhalers ready.',
  },
  'Allergic Rhinitis / Hay Fever': {
    thresholdAqi: 120,
    thresholdPm25: 45,
    guidance:
      'High mucosal sensitivity to coarse PM10 dust, Malwa paddy-stubble ash, and bio-aerosols. Recommend wrap-around glasses outdoors, isotonic saline nasal irrigation after exposure, antihistamine/nasal steroid adherence, and keeping windows closed during evening inversions.',
  },
  'Cardiovascular Disease': {
    thresholdAqi: 120,
    thresholdPm25: 40,
    guidance:
      'Ultrafine PM2.5 and traffic NO2 translocate into the bloodstream, triggering endothelial inflammation, blood-pressure spikes, and arrhythmia risk. Recommend avoiding outdoor aerobic exercise when AQI > 130, avoiding high-traffic bazaar corridors, and monitoring blood pressure.',
  },
  'Sensitive Skin/Eyes': {
    thresholdAqi: 140,
    thresholdPm25: 55,
    guidance:
      'Particulate soot, firework ash, and NO2 cause ocular surface tear-film instability and skin barrier oxidative stress. Recommend preservative-free lubricating eye drops, protective glasses outdoors, and gentle barrier-repair cleansing after returning indoors.',
  },
};

/**
 * Construct the context-aware system prompt injecting the user's health profile
 * and live/predicted local Patiala pollutant metrics (PM2.5, PM10, NO2, AQI, meteorology).
 */
export function buildHealthSystemPrompt(profile: UserHealthProfile, ctx: PollutantMetrics): string {
  const userName = profile.name.trim() || 'Guest User';
  const hasConditions = profile.conditions.length > 0;
  const conditionDetails = hasConditions
    ? profile.conditions
        .map((c) => `- ${c} (Safe AQI ceiling <= ${CONDITION_GUIDELINES[c].thresholdAqi}): ${CONDITION_GUIDELINES[c].guidance}`)
        .join('\n')
    : '- None declared (General Safe Mode: apply standard CPCB population thresholds, safe outdoor exercise ceiling AQI <= 150).';

  return [
    `You are VaayuVision Health Advisor, an environmental health & air-quality risk assistant for Patiala, Punjab.`,
    `USER PROFILE:`,
    `- Name: ${userName}`,
    `- Pre-existing Airborne Health Conditions:\n${conditionDetails}`,
    ``,
    `LIVE / PREDICTED LOCAL AIR QUALITY CONTEXT:`,
    `- Location: ${ctx.wardName} (${ctx.zone}, Patiala) on ${ctx.date}`,
    `- Indian CPCB AQI: ${ctx.aqi} (${ctx.category})`,
    `- PM2.5 (Fine Particulates): ${ctx.pm25} µg/m³ (CPCB 24h safe limit: 60 µg/m³; WHO: 15 µg/m³)`,
    `- PM10 (Coarse Dust & Ash): ${ctx.pm10} µg/m³ (CPCB 24h safe limit: 100 µg/m³)`,
    `- NO2 (Nitrogen Dioxide / Traffic & Combustion): ${ctx.no2} µg/m³ (CPCB 24h safe limit: 80 µg/m³)`,
    `- Meteorology: Wind ${ctx.windSpeed.toFixed(1)} m/s, Boundary-Layer Mixing Height ${Math.round(ctx.mixingHeightM)} m, Humidity ${Math.round(ctx.humidity)}%`,
    `- Diwali Phase Offset: ${ctx.daysFromDiwali === 0 ? 'Diwali Night (Peak Firecracker Emissions)' : `${ctx.daysFromDiwali} days from Diwali`}`,
    ``,
    `INSTRUCTIONS:`,
    `1. Address ${userName} warmly and ground every recommendation in the exact PM2.5 (${ctx.pm25} µg/m³), PM10 (${ctx.pm10} µg/m³), NO2 (${ctx.no2} µg/m³), and AQI (${ctx.aqi}) values in ${ctx.wardName}.`,
    `2. Tailor thresholds strictly to their selected conditions (${hasConditions ? profile.conditions.join(', ') : 'General Safe Mode'}).`,
    `3. Provide concise, actionable lifestyle guidance (mask grade, outdoor exercise safety, best ventilation window 13:00-16:00 IST, indoor purification) without diagnosing medical conditions.`,
  ].join('\n');
}

export function computeSafetyLevel(
  profile: UserHealthProfile,
  ctx: PollutantMetrics,
): AssistantChatResponse['safetyLevel'] {
  const strictestCeiling = profile.conditions.length
    ? Math.min(...profile.conditions.map((c) => CONDITION_GUIDELINES[c].thresholdAqi))
    : 150;

  if (ctx.aqi >= strictestCeiling + 150 || ctx.aqi >= 350) return 'critical';
  if (ctx.aqi >= strictestCeiling + 50 || ctx.aqi >= 250) return 'high-risk';
  if (ctx.aqi > strictestCeiling) return 'caution';
  return 'safe';
}

/**
 * Deterministic, condition-aware clinical advisor engine used when no external LLM API key
 * is configured (or when offline), guaranteeing <10 ms responses during live demos.
 */
function generateClinicalReply(req: AssistantChatRequest, safetyLevel: AssistantChatResponse['safetyLevel']): string {
  const { profile, context: ctx, message } = req;
  const name = profile.name.trim();
  const greeting = name ? `${name}, ` : '';
  const q = message.toLowerCase();
  const condList = profile.conditions;
  const hasAsthmaOrCopd =
    condList.includes('Asthma') || condList.includes('Chronic Obstructive Pulmonary Disease (COPD)');
  const hasCardio = condList.includes('Cardiovascular Disease');
  const hasRhinitis = condList.includes('Allergic Rhinitis / Hay Fever');
  const hasSkinEyes = condList.includes('Sensitive Skin/Eyes');

  const strictestAqi = condList.length
    ? Math.min(...condList.map((c) => CONDITION_GUIDELINES[c].thresholdAqi))
    : 150;

  const metricsLine = `Right now in **${ctx.wardName}** (${ctx.date}), AQI is **${ctx.aqi} (${ctx.category})** with **PM2.5 at ${ctx.pm25} µg/m³**, **PM10 at ${ctx.pm10} µg/m³**, and **NO₂ at ${ctx.no2} µg/m³** (wind ${ctx.windSpeed.toFixed(1)} m/s, mixing height ${Math.round(ctx.mixingHeightM)} m).`;

  const conditionNotes: string[] = [];
  if (condList.includes('Asthma')) {
    conditionNotes.push(
      `**Asthma Guidance:** Fine PM2.5 (${ctx.pm25} µg/m³) and NO₂ (${ctx.no2} µg/m³) penetrate deep into bronchioles and can trigger bronchospasm. Keep your rescue bronchodilator inhaler with you${ctx.aqi > 100 ? ' and avoid unmasked outdoor exposure' : ''}.`,
    );
  }
  if (condList.includes('Chronic Obstructive Pulmonary Disease (COPD)')) {
    conditionNotes.push(
      `**COPD Guidance:** At ${ctx.pm25} µg/m³ PM2.5, airway inflammation risk is ${ctx.aqi > 100 ? 'elevated — remain indoors with HEPA filtration and monitor SpO₂ if you feel breathless' : 'manageable with light activity only'}.`,
    );
  }
  if (hasRhinitis) {
    conditionNotes.push(
      `**Allergic Rhinitis / Hay Fever:** Coarse PM10 is **${ctx.pm10} µg/m³**${ctx.pm10 > 120 ? ' (carrying Malwa crop-ash and road dust) — use a saline nasal rinse after going out and keep windows sealed in the evening' : ' — mild dust load, keep antihistamine/nasal spray handy'}.`,
    );
  }
  if (hasCardio) {
    conditionNotes.push(
      `**Cardiovascular Protection:** Ultrafine PM2.5 (${ctx.pm25} µg/m³) and traffic NO₂ (${ctx.no2} µg/m³) increase vascular strain${ctx.aqi > 120 ? ' — replace outdoor cardio with indoor low-impact exercise today' : ''}.`,
    );
  }
  if (hasSkinEyes) {
    conditionNotes.push(
      `**Sensitive Skin & Eyes:** ${ctx.aqi > 140 ? `High particulate & NO₂ load (${ctx.no2} µg/m³) can irritate the tear film and skin barrier — wear wrap-around glasses outdoors, use preservative-free lubricating eye drops, and wash your face with a gentle cleanser upon returning.` : 'Low ocular/skin irritation risk today, though protective eyewear is helpful in bazaar traffic.'}`,
    );
  }
  if (!condList.length) {
    conditionNotes.push(
      `**General Safe Mode:** Using standard CPCB population thresholds (safe prolonged outdoor ceiling: AQI ≤ 150). Add your health conditions in **Profile Settings** for personalized clinical thresholds.`,
    );
  }

  // 1) Running / exercise / workout queries
  if (q.includes('run') || q.includes('jog') || q.includes('exercise') || q.includes('workout') || q.includes('walk') || q.includes('sport')) {
    const canExerciseOutdoors = ctx.aqi <= strictestAqi;
    const verdict = canExerciseOutdoors
      ? `**Yes — light-to-moderate outdoor exercise is acceptable** during the afternoon window (**13:00–16:00 IST**), as current AQI (${ctx.aqi}) is within your personal threshold (≤ ${strictestAqi}).`
      : `**No — avoid outdoor running or heavy exercise today.** Heavy breathing increases pollutant intake 5–8×, and **${ctx.wardName}** (AQI **${ctx.aqi}**, PM2.5 **${ctx.pm25} µg/m³**) exceeds your safe ceiling of **AQI ${strictestAqi}**${condList.length ? ` for ${condList.join(' & ')}` : ''}.`;
    const alt = canExerciseOutdoors
      ? `Stick to green buffers like **Baradari Gardens** or **Punjabi University** and avoid high-NO₂ bazaar corridors.`
      : `Switch to **indoor exercise** in a room with a HEPA air purifier, or if you must take a brief walk, go between **13:00–16:00 IST** wearing a valved **N95 / FFP2 mask**${hasAsthmaOrCopd ? ' (stop immediately if you experience wheezing or chest tightness)' : ''}.`;
    return [
      `${greeting}here is your activity safety check for **${ctx.wardName}**:`,
      metricsLine,
      verdict,
      alt,
      ...conditionNotes,
    ].join('\n\n');
  }

  // 2) Mask / respirator queries
  if (q.includes('mask') || q.includes('n95') || q.includes('respirator') || q.includes('wear')) {
    const maskCutoff = hasAsthmaOrCopd ? 100 : condList.length ? 120 : 180;
    const needsN95 = ctx.aqi >= maskCutoff;
    const maskAdvice = needsN95
      ? `**Yes — wear a well-fitted N95 / FFP2 (or KN95) mask outdoors today.** Cloth and surgical masks do **not** filter fine **PM2.5 (${ctx.pm25} µg/m³)** or firework/stubble aerosols.`
      : `**A mask is optional for short trips right now** (AQI ${ctx.aqi} is below your N95 threshold of ${maskCutoff}), but carry an **N95/KN95** if you plan to be near busy traffic corridors (NO₂ **${ctx.no2} µg/m³**) or out after **19:00 IST**.`;
    return [
      `${greeting}here is your mask recommendation for **${ctx.wardName}**:`,
      metricsLine,
      maskAdvice,
      ...conditionNotes,
    ].join('\n\n');
  }

  // 3) Ventilation / opening windows queries
  if (q.includes('ventilat') || q.includes('window') || q.includes('air purifier') || q.includes('indoor')) {
    const ventAdvice =
      ctx.aqi > 300
        ? `**Keep windows and doors sealed today** (AQI ${ctx.aqi} is ${ctx.category}). If you need brief fresh-air exchange, crack windows for **15–20 minutes only between 14:00 and 15:30 IST** when solar heating lifts the boundary layer (currently ${Math.round(ctx.mixingHeightM)} m) and PM2.5 dips by ~30%. Run a HEPA purifier continuously during evening hours (**19:00–02:00 IST**).`
        : `**Best ventilation window today: 13:00 to 16:00 IST.** Afternoon sunlight raises the planetary boundary layer and disperses surface PM2.5 (${ctx.pm25} µg/m³) and NO₂ (${ctx.no2} µg/m³). **Close all windows by 18:00 IST** before the nocturnal temperature inversion traps smoke.`;
    return [
      `${greeting}here is your indoor ventilation plan for **${ctx.wardName}**:`,
      metricsLine,
      ventAdvice,
      ...conditionNotes,
    ].join('\n\n');
  }

  // 4) Symptom logging queries
  if (q.includes('symptom') || q.includes('cough') || q.includes('wheez') || q.includes('breath') || q.includes('eye') || q.includes('headache') || q.includes('log')) {
    return [
      `${greeting}I have noted your symptom check against today's exposure in **${ctx.wardName}** (**AQI ${ctx.aqi} · PM2.5 ${ctx.pm25} µg/m³ · PM10 ${ctx.pm10} µg/m³ · NO₂ ${ctx.no2} µg/m³**).`,
      `**Environmental Correlation:** At PM2.5 **${ctx.pm25} µg/m³** and PM10 **${ctx.pm10} µg/m³**, ${ctx.aqi > 200 ? 'airway irritation, dry cough, sinus congestion, and eye burning are strongly correlated with high particulate and NO₂ load' : 'mild irritation can still occur for sensitive airways'}.`,
      `**Immediate Steps:**\n- Move to an indoor space with filtered air and rest.\n- Drink warm fluids and use isotonic saline spray/eye drops to flush particulates.\n- **Warning Sign:** If you experience persistent shortness of breath, chest pain, resting SpO₂ < 94%, or unremitting wheezing, seek medical care immediately (e.g., Rajindra Hospital / campus health center).`,
      ...conditionNotes,
    ].join('\n\n');
  }

  // 5) Default / "Is it safe outside for me right now?"
  const statusBanner =
    safetyLevel === 'critical'
      ? `**Status: CRITICAL RISK for your profile (Safe ceiling: AQI ≤ ${strictestAqi}).** Stay indoors as much as possible, seal windows, and wear a fit-tested **N95/FFP2 respirator** if stepping outside is unavoidable.`
      : safetyLevel === 'high-risk'
        ? `**Status: HIGH RISK for your profile (Safe ceiling: AQI ≤ ${strictestAqi}).** Limit outdoor time to essential trips between **13:00–16:00 IST** and wear an **N95 mask**.`
        : safetyLevel === 'caution'
          ? `**Status: MODERATE CAUTION for your profile (Safe ceiling: AQI ≤ ${strictestAqi}).** Short outdoor errands are okay, but avoid prolonged exertion near heavy traffic.`
          : `**Status: SAFE FOR YOUR PROFILE (AQI ${ctx.aqi} ≤ ${strictestAqi}).** Air quality is currently within your personalized safety threshold.`;

  return [
    `${greeting}here is your personalized safety assessment for **${ctx.wardName}**:`,
    metricsLine,
    statusBanner,
    `**Best Window Outdoors:** **13:00–16:00 IST** (afternoon boundary-layer mixing). **Avoid:** **19:00–01:00 IST** (evening inversion + firework/stubble trapping).`,
    ...conditionNotes,
  ].join('\n\n');
}

export async function generateAssistantResponse(req: AssistantChatRequest): Promise<AssistantChatResponse> {
  const systemPromptUsed = buildHealthSystemPrompt(req.profile, req.context);
  const safetyLevel = computeSafetyLevel(req.profile, req.context);

  // Optional live Gemini API call if GEMINI_API_KEY is configured in .env
  const geminiKey = process.env.GEMINI_API_KEY ?? '';
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPromptUsed }] },
            contents: [
              ...(req.history ?? []).slice(-6).map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
              { role: 'user', parts: [{ text: req.message }] },
            ],
            generationConfig: { temperature: 0.3, maxOutputTokens: 450 },
          }),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return { reply: text, systemPromptUsed, mode: 'llm-api', safetyLevel };
        }
      }
    } catch {
      // Fall back to clinical rule engine if offline
    }
  }

  return {
    reply: generateClinicalReply(req, safetyLevel),
    systemPromptUsed,
    mode: 'clinical-engine',
    safetyLevel,
  };
}
