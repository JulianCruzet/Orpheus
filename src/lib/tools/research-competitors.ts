import { ToolExecutionResult } from "@/lib/tools/types";

export interface ResearchCompetitorsInput {
  niche: string;
  region?: string;
  targetAudience?: string;
  productType?: string;
  competitorCount?: number;
}

export interface CompetitorCatalogItem {
  competitor: string;
  sampleProducts: string[];
  priceRangeUsd: {
    min: number;
    max: number;
  };
}

export interface ResearchCompetitorsOutput {
  competitorCatalogSnapshot: CompetitorCatalogItem[];
  pricingPatterns: {
    summary: string;
    commonAnchorsUsd: number[];
    discountBehavior: string;
  };
  positioningAnalysis: {
    dominantAngles: string[];
    whitespaceOpportunities: string[];
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

function validateInput(
  input: ResearchCompetitorsInput,
): ToolExecutionResult<never> | null {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid competitor research payload.",
      error: {
        code: "INVALID_INPUT",
        details: "Input must be an object.",
      },
    };
  }

  if (typeof input.niche !== "string" || input.niche.trim().length === 0) {
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

function buildMockOutput(
  input: ResearchCompetitorsInput,
): ResearchCompetitorsOutput {
  const niche = input.niche.trim();
  const competitorCount = Math.max(3, Math.min(6, input.competitorCount ?? 4));
  const basePrice = niche.length > 18 ? 42 : 28;

  const competitorCatalogSnapshot: CompetitorCatalogItem[] = Array.from(
    { length: competitorCount },
    (_, index) => {
      const i = index + 1;
      const min = clampCurrency(basePrice + i * 3);
      const max = clampCurrency(min * 1.8);

      return {
        competitor: `${niche} co. ${i}`,
        sampleProducts: [
          `${niche} starter kit ${i}`,
          `${niche} premium bundle ${i}`,
          `${niche} refill pack ${i}`,
        ],
        priceRangeUsd: {
          min,
          max,
        },
      };
    },
  );

  return {
    competitorCatalogSnapshot,
    pricingPatterns: {
      summary:
        "Most competitors cluster around a mid-tier anchor, then ladder up into premium bundles with add-ons.",
      commonAnchorsUsd: [29, 39, 59],
      discountBehavior:
        "Frequent 10-15% promo windows around weekends and month-end.",
    },
    positioningAnalysis: {
      dominantAngles: [
        "premium quality messaging",
        "fast shipping + convenience",
        "beginner-friendly onboarding",
      ],
      whitespaceOpportunities: [
        "clear side-by-side value comparison",
        "evidence-backed ROI proof",
        "subscription bundle with transparent savings",
      ],
      recommendation:
        "Position as the highest-clarity offer with concrete proof points and a simple value-tier entry package.",
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

function parseGeminiJson(text: string): ResearchCompetitorsOutput | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as ResearchCompetitorsOutput;
  } catch {
    return null;
  }
}

async function researchWithGemini(
  input: ResearchCompetitorsInput,
): Promise<ResearchCompetitorsOutput> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const prompt = [
    "You are a competitor analyst for ecommerce founders.",
    "Return valid JSON only with this exact schema:",
    "{",
    '  "competitorCatalogSnapshot": [{ "competitor": string, "sampleProducts": string[], "priceRangeUsd": { "min": number, "max": number } }],',
    '  "pricingPatterns": { "summary": string, "commonAnchorsUsd": number[], "discountBehavior": string },',
    '  "positioningAnalysis": { "dominantAngles": string[], "whitespaceOpportunities": string[], "recommendation": string }',
    "}",
    "Constraints:",
    "- competitorCatalogSnapshot must include 3-6 competitors",
    "- price values must be positive numbers",
    "- keep recommendation concise and actionable",
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

  parsed.competitorCatalogSnapshot = (parsed.competitorCatalogSnapshot ?? [])
    .slice(0, 6)
    .map((item) => ({
      competitor: item.competitor?.trim() || "Unknown competitor",
      sampleProducts: (item.sampleProducts ?? [])
        .map((product) => product.trim())
        .filter(Boolean)
        .slice(0, 5),
      priceRangeUsd: {
        min: clampCurrency(item.priceRangeUsd?.min ?? 1),
        max: clampCurrency(item.priceRangeUsd?.max ?? item.priceRangeUsd?.min ?? 1),
      },
    }))
    .filter((item) => item.sampleProducts.length > 0);

  parsed.pricingPatterns.commonAnchorsUsd = (
    parsed.pricingPatterns.commonAnchorsUsd ?? []
  )
    .map((value) => clampCurrency(value))
    .slice(0, 6);

  parsed.positioningAnalysis.dominantAngles = (
    parsed.positioningAnalysis.dominantAngles ?? []
  )
    .map((angle) => angle.trim())
    .filter(Boolean)
    .slice(0, 6);

  parsed.positioningAnalysis.whitespaceOpportunities = (
    parsed.positioningAnalysis.whitespaceOpportunities ?? []
  )
    .map((gap) => gap.trim())
    .filter(Boolean)
    .slice(0, 6);

  return parsed;
}

export async function researchCompetitors(
  input: ResearchCompetitorsInput,
): Promise<ToolExecutionResult<ResearchCompetitorsOutput>> {
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  try {
    const output = isMockModeEnabled()
      ? buildMockOutput(input)
      : await researchWithGemini(input);

    return {
      status: "success",
      message: `competitor research generated for "${input.niche.trim()}".`,
      data: output,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "error",
      message: "unable to complete competitor research right now.",
      error: {
        code: "RESEARCH_COMPETITORS_FAILED",
        details,
      },
    };
  }
}
