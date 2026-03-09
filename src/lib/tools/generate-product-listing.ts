import { ToolExecutionResult } from "@/lib/tools/types";

export interface GenerateProductListingInput {
  productName: string;
  category?: string;
  targetAudience?: string;
  keyFeatures?: string[];
  tone?: "professional" | "playful" | "luxury" | "minimal";
  priceFloor?: number;
  priceCeiling?: number;
}

export interface GenerateProductListingOutput {
  title: string;
  description: string;
  tags: string[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    slug: string;
  };
  pricingSuggestion: {
    suggestedPrice: number;
    currency: "USD";
    rationale: string;
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function clampPrice(value: number): number {
  return Math.round(Math.max(1, value) * 100) / 100;
}

function buildMockOutput(input: GenerateProductListingInput): GenerateProductListingOutput {
  const base = input.productName.trim();
  const category = input.category?.trim() || "general";
  const audience = input.targetAudience?.trim() || "modern shoppers";
  const features = input.keyFeatures?.filter(Boolean) ?? [];

  const midpoint =
    input.priceFloor !== undefined && input.priceCeiling !== undefined
      ? (input.priceFloor + input.priceCeiling) / 2
      : input.priceCeiling ?? input.priceFloor ?? 39.99;

  const suggestedPrice = clampPrice(midpoint);
  const title = `${base} | ${category} essential`;
  const description = `meet ${base}, built for ${audience}. ${
    features.length > 0
      ? `top highlights: ${features.slice(0, 4).join(", ")}.`
      : "designed for daily performance, comfort, and style."
  } crafted to stand out while staying practical for everyday use.`;

  const tags = Array.from(
    new Set(
      [base, category, audience, ...(features.length > 0 ? features : ["everyday", "premium"])].map(
        (tag) => tag.toLowerCase().trim(),
      ),
    ),
  )
    .filter((tag) => tag.length > 0)
    .slice(0, 12);

  return {
    title,
    description,
    tags,
    seo: {
      metaTitle: title.slice(0, 70),
      metaDescription: description.slice(0, 155),
      slug: slugify(base),
    },
    pricingSuggestion: {
      suggestedPrice,
      currency: "USD",
      rationale:
        input.priceFloor !== undefined || input.priceCeiling !== undefined
          ? "Price anchored to the provided floor/ceiling range."
          : "Defaulted to a balanced MVP launch price for quick validation.",
    },
  };
}

function validateInput(
  input: GenerateProductListingInput,
): ToolExecutionResult<never> | null {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid listing payload.",
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

function extractText(response: GeminiTextResponse): string {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function parseGeminiJson(text: string): GenerateProductListingOutput | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as GenerateProductListingOutput;
  } catch {
    return null;
  }
}

async function generateWithGemini(
  input: GenerateProductListingInput,
): Promise<GenerateProductListingOutput> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const prompt = [
    "You are an ecommerce copywriter.",
    "Return valid JSON only with this exact schema:",
    "{",
    '  "title": string,',
    '  "description": string,',
    '  "tags": string[],',
    '  "seo": { "metaTitle": string, "metaDescription": string, "slug": string },',
    '  "pricingSuggestion": { "suggestedPrice": number, "currency": "USD", "rationale": string }',
    "}",
    "Constraints:",
    "- title <= 70 chars",
    "- metaDescription <= 155 chars",
    "- slug lowercase-hyphenated",
    "- tags max 12",
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

  parsed.seo.slug = slugify(parsed.seo.slug || input.productName);
  parsed.seo.metaTitle = (parsed.seo.metaTitle || parsed.title).slice(0, 70);
  parsed.seo.metaDescription = parsed.seo.metaDescription.slice(0, 155);
  parsed.tags = (parsed.tags || []).map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
  parsed.pricingSuggestion.suggestedPrice = clampPrice(parsed.pricingSuggestion.suggestedPrice);
  parsed.pricingSuggestion.currency = "USD";

  return parsed;
}

export async function generateProductListing(
  input: GenerateProductListingInput,
): Promise<ToolExecutionResult<GenerateProductListingOutput>> {
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  try {
    const output = isMockModeEnabled()
      ? buildMockOutput(input)
      : await generateWithGemini(input);

    return {
      status: "success",
      message: `generated listing for "${input.productName.trim()}".`,
      data: output,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "error",
      message: "unable to generate listing right now.",
      error: {
        code: "GENERATE_PRODUCT_LISTING_FAILED",
        details,
      },
    };
  }
}
