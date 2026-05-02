export interface ForensicReport {
  verdict: string;
  is_fake: boolean;
  real_news: string;
  representative_text: string;
  scores: { factuality: number; bias: number; intent: number };
  tactical_intent: { label: string; strength: number }[];
  provenance_trace: { step: string; time_marker: string }[];
  semantic_mismatch: {
    headline: string;
    body_excerpt: string;
    confidence: number;
    note: string;
  };
  forensic_findings: {
    snippet: string;
    fallacy: string;
    explanation: string;
    severity: "low" | "med" | "high";
  }[];
}

const SYSTEM_PROMPT = `You are Vigilant·AI, a forensic misinformation analyst.

You receive a SPECIMEN that is either a URL or raw text/claim.
Analyze it and return a JSON object (no markdown, no code fences, raw JSON only) with these exact fields:

- verdict: string (max 12 words summary)
- is_fake: boolean (true if the news/claim is fake or misleading, false if real/credible)
- real_news: string (if is_fake is true, provide the accurate, factual version of the story in 3-5 sentences. If is_fake is false, write "This news appears to be accurate.")
- representative_text: string (if specimen was a URL, write a plausible representative paragraph; otherwise echo the specimen)
- scores: { factuality: integer 0-100, bias: integer 0-100, intent: integer 0-100 }
- tactical_intent: array of { label: string, strength: integer 0-100 } (3-5 items)
- provenance_trace: array of { step: string, time_marker: string } (3-5 items)
- semantic_mismatch: { headline: string, body_excerpt: string, confidence: number 0-1, note: string }
- forensic_findings: array of { snippet: string, fallacy: string, explanation: string, severity: "low"|"med"|"high" } (4-8 items)

Be calibrated, not alarmist. If the specimen is benign, scores should reflect that. Return ONLY the raw JSON object.`;

// Models tried in order — fall back if quota is exhausted
const GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-pro-preview",
];

async function callGemini(model: string, userPrompt: string, apiKey: string): Promise<ForensicReport> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (response.status === 429 || response.status === 503) {
    // Quota exhausted — signal caller to try next model
    throw Object.assign(new Error("QUOTA_EXHAUSTED"), { quota: true });
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("No response from Gemini.");

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned) as ForensicReport;
}

export async function runGeminiScan(specimen: string, mode: "url" | "text"): Promise<ForensicReport> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured.");

  const userPrompt = `Mode: ${mode === "url" ? "URL" : "TEXT"}\nSpecimen:\n"""\n${specimen}\n"""\n\nReturn the forensic report as raw JSON only.`;

  let lastError: Error = new Error("All models exhausted.");

  for (const model of GEMINI_MODELS) {
    try {
      console.info(`[Vigilant·AI] Trying model: ${model}`);
      return await callGemini(model, userPrompt, apiKey);
    } catch (err) {
      lastError = err as Error;
      if ((err as { quota?: boolean }).quota) {
        console.warn(`[Vigilant·AI] Quota hit on ${model}, trying next…`);
        continue; // try next model
      }
      throw err; // non-quota error — surface immediately
    }
  }

  throw new Error(
    `All Gemini models are currently rate-limited. Please wait a minute and try again.\n\nDetails: ${lastError.message}`
  );
}
