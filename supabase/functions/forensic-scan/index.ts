const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are Vigilant·AI, a forensic misinformation analyst.

You receive a SPECIMEN that is either a URL or raw text/claim.
You analyze it like a digital microscope and call the "return_forensic_report" tool with:
- Three integer scores 0-100: factuality (high = more factual), bias (high = more biased), intent (high = more manipulative intent).
- A short verdict (max 12 words).
- 3-5 tactical_intent triggers (fear, urgency, in-group bias, etc.) with 0-100 strength.
- 3-5 provenance_trace steps describing a plausible origin lineage with relative time markers like "T-72h".
- A semantic_mismatch object with headline, body_excerpt and a confidence 0-1 plus a short note.
- An array of forensic_findings (the Motive Heatmap source) — each finding is a snippet of the specimen text plus a logical fallacy / manipulation technique label, an explanation, and severity (low|med|high). Aim for 4-8 findings of varying severity. The 'snippet' MUST be a verbatim substring of the specimen so the UI can locate it. If the specimen is a URL with no text body, invent a plausible representative paragraph and base the findings on that paragraph (return it as 'representative_text').

Be calibrated, not alarmist. If the specimen is benign, scores should reflect that.`;

const TOOL = {
  type: "function",
  function: {
    name: "return_forensic_report",
    description: "Return a structured forensic misinformation report.",
    parameters: {
      type: "object",
      properties: {
        verdict: { type: "string" },
        representative_text: { type: "string", description: "If the specimen was a bare URL, the representative paragraph the analysis is grounded on. Otherwise echo the specimen text." },
        scores: {
          type: "object",
          properties: {
            factuality: { type: "integer", minimum: 0, maximum: 100 },
            bias: { type: "integer", minimum: 0, maximum: 100 },
            intent: { type: "integer", minimum: 0, maximum: 100 },
          },
          required: ["factuality", "bias", "intent"],
          additionalProperties: false,
        },
        tactical_intent: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              strength: { type: "integer", minimum: 0, maximum: 100 },
            },
            required: ["label", "strength"],
            additionalProperties: false,
          },
        },
        provenance_trace: {
          type: "array",
          items: {
            type: "object",
            properties: {
              step: { type: "string" },
              time_marker: { type: "string" },
            },
            required: ["step", "time_marker"],
            additionalProperties: false,
          },
        },
        semantic_mismatch: {
          type: "object",
          properties: {
            headline: { type: "string" },
            body_excerpt: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            note: { type: "string" },
          },
          required: ["headline", "body_excerpt", "confidence", "note"],
          additionalProperties: false,
        },
        forensic_findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              snippet: { type: "string", description: "Verbatim substring of the specimen / representative_text." },
              fallacy: { type: "string", description: "Name of the manipulation technique or fallacy." },
              explanation: { type: "string" },
              severity: { type: "string", enum: ["low", "med", "high"] },
            },
            required: ["snippet", "fallacy", "explanation", "severity"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "verdict",
        "representative_text",
        "scores",
        "tactical_intent",
        "provenance_trace",
        "semantic_mismatch",
        "forensic_findings",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { specimen, mode } = await req.json();
    if (!specimen || typeof specimen !== "string" || specimen.length > 8000) {
      return new Response(JSON.stringify({ error: "Invalid specimen (must be a string ≤ 8000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Mode: ${mode === "url" ? "URL" : "TEXT"}\nSpecimen:\n"""\n${specimen}\n"""\n\nReturn the forensic report by calling the tool.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "return_forensic_report" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment and try again." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: `AI gateway error ${aiResp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Model did not return a structured report." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let report;
    try {
      report = JSON.parse(toolCall.function.arguments);
    } catch (_e) {
      return new Response(JSON.stringify({ error: "Malformed report JSON." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ report }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("forensic-scan error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});