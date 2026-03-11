import { ToolExecutionResult } from "@/lib/tools/types";

export interface ResearchMarketInput {
  niche?: string;
  query?: string;    // alias — schema sends `query`, handler expects `niche`
  region?: string;
  targetAudience?: string;
  productType?: string;
  budgetLevel?: "low" | "medium" | "high";
}

export interface ResearchMarketOutput {
  nicheSummary: string;
  competitorPricingRange: {
    min: number;
    max: number;
    currency: "USD";
    notes: string;
  };
  keywordTrendSummary: {
    topKeywords: string[];
    trendDirection: "up" | "flat" | "mixed";
    notes: string;
  };
  opportunityScore: {
    score: number;
    recommendation: string;
  };
}

interface GeminiTextResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

function clampCurrency(value: number): number {
  return Math.round(Math.max(1, value) * 100) / 100;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeInput(input: ResearchMarketInput): ResearchMarketInput {
  // Schema sends `query`, handler expects `niche` — normalize
  if (!input.niche && input.query) {
    input.niche = input.query;
  }
  return input;
}

function validateInput(input: ResearchMarketInput): ToolExecutionResult<never> | null {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid research payload.",
      error: {
        code: "INVALID_INPUT",
        details: "Input must be an object.",
      },
    };
  }

  if (typeof input.niche !== "string" || (input.niche ?? "").trim().length === 0) {
    return {
      status: "error",
      message: "niche is required.",
      error: {
        code: "INVALID_NICHE",
        details: "`niche` must be a non-empty string.",
      },
    };
  }

  return null;
}

function buildMockOutput(input: ResearchMarketInput): ResearchMarketOutput {
  const niche = (input.niche ?? "").trim();
  const region = input.region?.trim() || "north america";
  const audience = input.targetAudience?.trim() || "online-first shoppers";

  const baseline =
    input.budgetLevel === "high" ? 89 : input.budgetLevel === "low" ? 29 : 54;

  return {
    nicheSummary: `${niche} in ${region} is competitive but still expanding, especially among ${audience}. Buyers respond to clear value propositions and proof-driven product messaging.`,
    competitorPricingRange: {
      min: clampCurrency(baseline * 0.7),
      max: clampCurrency(baseline * 1.55),
      currency: "USD",
      notes: "Range estimated from similar DTC offers and category benchmarks in mock mode.",
    },
    keywordTrendSummary: {
      topKeywords: [
        `${niche} essentials`,
        `best ${niche}`,
        `${niche} starter kit`,
        `${niche} value bundle`,
      ],
      trendDirection: "up",
      notes:
        "Search intent clusters around value bundles and beginner-friendly options with fast shipping.",
    },
    opportunityScore: {
      score: 78,
      recommendation:
        "Launch with a value-tier offer first, then upsell premium bundles once conversion data stabilizes.",
    },
  };
}

function extractText(response: GeminiTextResponse): string {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function parseGeminiJson(text: string): ResearchMarketOutput | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as ResearchMarketOutput;
  } catch {
    return null;
  }
}

async function researchWithGemini(
  input: ResearchMarketInput,
): Promise<ResearchMarketOutput> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const prompt = [
    "You are a market intelligence analyst for ecommerce founders.",
    "Return valid JSON only with this exact schema:",
    "{",
    '  "nicheSummary": string,',
    '  "competitorPricingRange": { "min": number, "max": number, "currency": "USD", "notes": string },',
    '  "keywordTrendSummary": { "topKeywords": string[], "trendDirection": "up"|"flat"|"mixed", "notes": string },',
    '  "opportunityScore": { "score": number, "recommendation": string }',
    "}",
    "Constraints:",
    "- pricing values must be positive numbers",
    "- topKeywords must include 3-8 short, practical phrases",
    "- score must be 0-100",
    "- recommendation should be one concise, actionable sentence",
    "Input:",
    JSON.stringify(input),
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}).`);
  }

  const data = (await response.json()) as GeminiTextResponse;
  const text = extractText(data);
  const parsed = parseGeminiJson(text);

  if (!parsed) {
    throw new Error("Gemini did not return parseable JSON.");
  }

  parsed.competitorPricingRange.min = clampCurrency(parsed.competitorPricingRange.min);
  parsed.competitorPricingRange.max = clampCurrency(parsed.competitorPricingRange.max);
  parsed.competitorPricingRange.currency = "USD";
  parsed.keywordTrendSummary.topKeywords = (parsed.keywordTrendSummary.topKeywords || [])
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 8);
  parsed.keywordTrendSummary.trendDirection = ["up", "flat", "mixed"].includes(
    parsed.keywordTrendSummary.trendDirection,
  )
    ? parsed.keywordTrendSummary.trendDirection
    : "mixed";
  parsed.opportunityScore.score = clampScore(parsed.opportunityScore.score);

  return parsed;
}

function buildCachedBackupOutput(input: ResearchMarketInput): ResearchMarketOutput {
  const niche = (input.niche ?? "").trim();

  return {
    nicheSummary: `${niche} demand is stable with improving conversion potential when paired with social proof and creator-led content.`,
    competitorPricingRange: {
      min: 24.99,
      max: 79.99,
      currency: "USD",
      notes: "Cached fallback benchmark based on prior successful demo runs.",
    },
    keywordTrendSummary: {
      topKeywords: [
        `${niche} bundle`,
        `best ${niche} online`,
        `${niche} starter pack`,
        `${niche} free shipping`,
      ],
      trendDirection: "mixed",
      notes:
        "Cached backup indicates strongest intent around bundles, entry pricing, and shipping incentives.",
    },
    opportunityScore: {
      score: 72,
      recommendation:
        "Lead with a value bundle and test urgency messaging to lift first-purchase conversion.",
    },
  };
}

export async function researchMarket(
  input: ResearchMarketInput,
): Promise<ToolExecutionResult<ResearchMarketOutput>> {
  normalizeInput(input);
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  const mockMode = isMockModeEnabled();

  if (mockMode) {
    return {
      status: "success",
      message: `market research generated for "${(input.niche ?? "").trim()}" (mock mode).`,
      data: buildMockOutput(input),
    };
  }

  try {
    const output = await researchWithGemini(input);

    return {
      status: "success",
      message: `market research generated for "${(input.niche ?? "").trim()}".`,
      data: output,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    const cachedOutput = buildCachedBackupOutput(input);

    return {
      status: "success",
      message:
        "live market research was unavailable, so a cached backup snapshot was returned.",
      data: cachedOutput,
      error: {
        code: "RESEARCH_MARKET_FALLBACK_USED",
        details,
      },
    };
  }
}
