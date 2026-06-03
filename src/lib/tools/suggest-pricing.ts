import { ToolExecutionResult } from "@/lib/tools/types";

export type Positioning = "budget" | "mid-market" | "premium";

export interface SuggestPricingInput {
  productName: string;
  category?: string;
  currentPrice?: number;
  unitCost?: number;
  targetAudience?: string;
  positioning?: Positioning;
}

export interface SuggestPricingOutput {
  suggestedPrice: number;
  currency: "USD";
  priceRange: {
    min: number;
    max: number;
  };
  competitorBenchmark: {
    min: number;
    max: number;
    median: number;
    notes: string;
  };
  margin?: {
    unitCost: number;
    grossMarginPct: number;
    note: string;
  };
  positioning: Positioning;
  strategy: string;
  rationale: string;
  confidence: "low" | "medium" | "high";
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

function clampPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
}

function grossMarginPct(price: number, cost: number): number {
  if (price <= 0) return 0;
  return clampPercent(((price - cost) / price) * 100);
}

function validateInput(
  input: SuggestPricingInput,
): ToolExecutionResult<never> | null {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid pricing payload.",
      error: {
        code: "INVALID_INPUT",
        details: "Input must be an object.",
      },
    };
  }

  if (typeof input.productName !== "string" || input.productName.trim().length === 0) {
    return {
      status: "error",
      message: "productName is required.",
      error: {
        code: "INVALID_PRODUCT_NAME",
        details: "`productName` must be a non-empty string.",
      },
    };
  }

  return null;
}

// Realistic retail markups over unit cost, by positioning. Keystone (2x) is the
// classic floor; mid-market sits around 3x, premium higher — these keep mock
// suggestions in a believable range instead of a fixed category anchor.
const COST_MARKUP: Record<Positioning, number> = {
  budget: 2.2,
  "mid-market": 3.0,
  premium: 4.5,
};

// How the suggested price moves relative to the reference, by positioning.
const POSITIONING_NUDGE: Record<Positioning, number> = {
  budget: 0.95,
  "mid-market": 1.0,
  premium: 1.12,
};

// Fallback category anchors used only when we have no price or cost signal.
const CATEGORY_ANCHOR: Record<Positioning, number> = {
  budget: 24,
  "mid-market": 49,
  premium: 89,
};

/**
 * Derive a believable price from the strongest signal available, in priority
 * order: the product's current price → a realistic markup over unit cost →
 * a category anchor. Anchoring on real inputs is what keeps the recommendation
 * from drifting into outlandish territory (e.g. a $20 phone stand at $47).
 *
 * Exported so the mock-mode handler and the tool share one source of truth.
 */
export function buildMockPricingOutput(
  input: SuggestPricingInput,
): SuggestPricingOutput {
  const positioning: Positioning = input.positioning ?? "mid-market";
  const cost =
    typeof input.unitCost === "number" && input.unitCost >= 0
      ? input.unitCost
      : undefined;
  const current =
    typeof input.currentPrice === "number" && input.currentPrice > 0
      ? input.currentPrice
      : undefined;

  let reference: number;
  let basis: "current-price" | "unit-cost" | "category";
  if (current !== undefined) {
    reference = current;
    basis = "current-price";
  } else if (cost !== undefined && cost > 0) {
    reference = cost * COST_MARKUP[positioning];
    basis = "unit-cost";
  } else {
    reference = CATEGORY_ANCHOR[positioning];
    basis = "category";
  }

  let suggestedPrice = clampCurrency(reference * POSITIONING_NUDGE[positioning]);

  // Guardrail: never price below cost, and keep at least a ~33% margin.
  if (cost !== undefined && cost > 0) {
    const floor = clampCurrency(cost * 1.5);
    if (suggestedPrice < floor) suggestedPrice = floor;
  }

  const benchMedian = clampCurrency(reference);
  const benchMin = clampCurrency(reference * 0.8);
  const benchMax = clampCurrency(reference * 1.3);

  const benchmarkNotes =
    basis === "current-price"
      ? "Benchmark anchored on the product's current price and comparable offers (mock mode)."
      : basis === "unit-cost"
        ? "Benchmark derived from a typical retail markup over your unit cost (mock mode)."
        : "Benchmark estimated from comparable category offers (mock mode).";

  const rationale =
    basis === "current-price"
      ? `Your current price of $${clampCurrency(current!)} sits near the comparable median of $${benchMedian}; a ${positioning} placement at $${suggestedPrice} keeps you competitive.`
      : basis === "unit-cost"
        ? `At a $${clampCurrency(cost!)} unit cost, a ${positioning} retail price of $${suggestedPrice} reflects a realistic markup while protecting margin.`
        : `Comparable ${input.category ?? "products"} cluster around $${benchMedian}; a ${positioning} placement at $${suggestedPrice} balances conversion with margin.`;

  const output: SuggestPricingOutput = {
    suggestedPrice,
    currency: "USD",
    priceRange: {
      min: clampCurrency(suggestedPrice * 0.92),
      max: clampCurrency(suggestedPrice * 1.12),
    },
    competitorBenchmark: {
      min: benchMin,
      max: benchMax,
      median: benchMedian,
      notes: benchmarkNotes,
    },
    positioning,
    strategy:
      positioning === "premium"
        ? "Anchor above the category median and justify with quality proof, packaging, and a satisfaction guarantee."
        : positioning === "budget"
          ? "Undercut the category median to win on value, then upsell with bundles."
          : "Price near the competitor median and test small increases as reviews build trust.",
    rationale,
    // We only have a real signal when current price or cost was provided.
    confidence: basis === "category" ? "low" : "medium",
  };

  if (cost !== undefined && cost >= 0) {
    output.margin = {
      unitCost: clampCurrency(cost),
      grossMarginPct: grossMarginPct(suggestedPrice, cost),
      note: "Gross margin at the suggested price before shipping and fees.",
    };
  }

  return output;
}

function buildCachedBackupOutput(input: SuggestPricingInput): SuggestPricingOutput {
  // Conservative, always-valid snapshot used when the live model is unavailable.
  const suggestedPrice = 39.99;

  const output: SuggestPricingOutput = {
    suggestedPrice,
    currency: "USD",
    priceRange: { min: 34.99, max: 46.99 },
    competitorBenchmark: {
      min: 24.99,
      max: 64.99,
      median: 42.0,
      notes: "Cached fallback benchmark based on prior category runs.",
    },
    positioning: input.positioning ?? "mid-market",
    strategy:
      "Lead with a value-tier price near the median, then test a premium bundle to raise average order value.",
    rationale: `Live pricing analysis was unavailable, so a cached benchmark for "${input.productName.trim()}" was used.`,
    confidence: "low",
  };

  if (typeof input.unitCost === "number" && input.unitCost >= 0) {
    output.margin = {
      unitCost: clampCurrency(input.unitCost),
      grossMarginPct: grossMarginPct(suggestedPrice, input.unitCost),
      note: "Gross margin at the suggested price before shipping and fees.",
    };
  }

  return output;
}

function extractText(response: GeminiTextResponse): string {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function parseGeminiJson(text: string): SuggestPricingOutput | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as SuggestPricingOutput;
  } catch {
    return null;
  }
}

function normalizeOutput(
  parsed: SuggestPricingOutput,
  input: SuggestPricingInput,
): SuggestPricingOutput {
  parsed.suggestedPrice = clampCurrency(parsed.suggestedPrice);
  parsed.currency = "USD";

  parsed.priceRange = parsed.priceRange ?? { min: 0, max: 0 };
  parsed.priceRange.min = clampCurrency(parsed.priceRange.min);
  parsed.priceRange.max = clampCurrency(parsed.priceRange.max);
  if (parsed.priceRange.max < parsed.priceRange.min) {
    const swap = parsed.priceRange.min;
    parsed.priceRange.min = parsed.priceRange.max;
    parsed.priceRange.max = swap;
  }

  parsed.competitorBenchmark = parsed.competitorBenchmark ?? {
    min: 0,
    max: 0,
    median: 0,
    notes: "",
  };
  parsed.competitorBenchmark.min = clampCurrency(parsed.competitorBenchmark.min);
  parsed.competitorBenchmark.max = clampCurrency(parsed.competitorBenchmark.max);
  parsed.competitorBenchmark.median = clampCurrency(
    parsed.competitorBenchmark.median,
  );

  parsed.positioning = ["budget", "mid-market", "premium"].includes(
    parsed.positioning,
  )
    ? parsed.positioning
    : input.positioning ?? "mid-market";

  parsed.confidence = ["low", "medium", "high"].includes(parsed.confidence)
    ? parsed.confidence
    : "medium";

  // Guardrail: never let the model price at or below cost. Floor at a ~33%
  // margin and keep the range consistent with the corrected price.
  if (typeof input.unitCost === "number" && input.unitCost > 0) {
    const floor = clampCurrency(input.unitCost * 1.5);
    if (parsed.suggestedPrice < floor) {
      parsed.suggestedPrice = floor;
      parsed.priceRange.min = Math.min(parsed.priceRange.min, floor);
      parsed.priceRange.max = Math.max(parsed.priceRange.max, clampCurrency(floor * 1.12));
    }
  }

  // Recompute margin from authoritative cost input so the math is trustworthy.
  if (typeof input.unitCost === "number" && input.unitCost >= 0) {
    parsed.margin = {
      unitCost: clampCurrency(input.unitCost),
      grossMarginPct: grossMarginPct(parsed.suggestedPrice, input.unitCost),
      note: "Gross margin at the suggested price before shipping and fees.",
    };
  } else {
    delete parsed.margin;
  }

  return parsed;
}

async function suggestWithGemini(
  input: SuggestPricingInput,
): Promise<SuggestPricingOutput> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const prompt = [
    "You are a pricing strategist for ecommerce founders.",
    "Recommend an optimal price using competitor benchmarks, positioning, and demand signals.",
    "Return valid JSON only with this exact schema:",
    "{",
    '  "suggestedPrice": number,',
    '  "currency": "USD",',
    '  "priceRange": { "min": number, "max": number },',
    '  "competitorBenchmark": { "min": number, "max": number, "median": number, "notes": string },',
    '  "positioning": "budget" | "mid-market" | "premium",',
    '  "strategy": string,',
    '  "rationale": string,',
    '  "confidence": "low" | "medium" | "high"',
    "}",
    "Constraints:",
    "- all prices must be positive USD numbers",
    "- priceRange.min <= suggestedPrice <= priceRange.max",
    "- competitorBenchmark.min <= median <= max",
    "- strategy and rationale must each be one concise, actionable sentence",
    "- keep prices realistic for the product type — do NOT recommend prices wildly above what such a product normally sells for",
    "- if currentPrice is provided, stay within roughly ±30% of it unless there is a clear reason, and anchor the benchmark around it",
    "- if unitCost is provided, use a realistic retail markup (about 2x-5x cost) and never price at or below cost; set confidence to at most 'medium' since this is an estimate, not live data",
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

  return normalizeOutput(parsed, input);
}

export async function suggestPricing(
  input: SuggestPricingInput,
): Promise<ToolExecutionResult<SuggestPricingOutput>> {
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  if (isMockModeEnabled()) {
    return {
      status: "success",
      message: `pricing recommendation generated for "${input.productName.trim()}" (mock mode).`,
      data: buildMockPricingOutput(input),
    };
  }

  try {
    const output = await suggestWithGemini(input);

    return {
      status: "success",
      message: `pricing recommendation generated for "${input.productName.trim()}".`,
      data: output,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    const cachedOutput = buildCachedBackupOutput(input);

    return {
      status: "success",
      message:
        "live pricing analysis was unavailable, so a cached benchmark was returned.",
      data: cachedOutput,
      error: {
        code: "SUGGEST_PRICING_FALLBACK_USED",
        details,
      },
    };
  }
}
