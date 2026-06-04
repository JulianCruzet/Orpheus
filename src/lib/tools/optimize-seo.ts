import { ToolExecutionResult } from "@/lib/tools/types";

export interface OptimizeSeoInput {
  title: string;
  description?: string;
  tags?: string[];
  productName?: string;
  targetKeywords?: string[];
}

export type SeoSeverity = "low" | "medium" | "high";

export interface SeoIssue {
  field: "title" | "description" | "tags" | "keywords";
  severity: SeoSeverity;
  message: string;
}

export interface OptimizeSeoOutput {
  seoScore: number;
  issues: SeoIssue[];
  keywords: {
    found: string[];
    missing: string[];
  };
  suggestions: {
    title: string;
    metaDescription: string;
    tags: string[];
    altText: string;
  };
  contentIdeas: string[];
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

// Ideal ranges based on common SEO guidance.
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const META_MIN = 120;
const META_MAX = 160;
const TAGS_MIN = 3;
const TAGS_MAX = 12;

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

// The model sometimes passes the user's whole request (e.g. "audit the seo for
// the zenflow desk lamp") as the title instead of the catalog title. Detect that
// shape and pull out the actual product name so suggestions don't echo the
// request back. Leaves a normal title untouched (it won't contain "seo ... for").
function cleanProductText(raw: string): string {
  const text = (raw ?? "").trim();
  if (!text) return text;

  const match = text.match(
    /\b(?:audit|improve|optimi[sz]e|fix|review|check|boost|enhance|update|do|run|help)\b.*?\bseo\b.*?\b(?:for|on|of)\s+(?:the|my|our|your)?\s*(.+?)[.?!]*\s*$/i,
  );
  if (match && match[1] && match[1].trim().length > 0) {
    // Drop trailing politeness/filler so we keep just the product name.
    return match[1].replace(/\s+(please|thanks|thank you|for me|now)\b\.?$/i, "").trim();
  }

  return text;
}

// Normalize an SEO input so downstream audit + suggestions work off the real
// product name. Exported so the mock handler applies the same cleanup.
export function normalizeSeoInput(input: OptimizeSeoInput): OptimizeSeoInput {
  return {
    ...input,
    title: cleanProductText(input.title ?? ""),
    ...(input.productName !== undefined && {
      productName: cleanProductText(input.productName),
    }),
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Deterministic SEO audit. This is real logic — it runs the same way with or
 * without an LLM, and produces the score, issues, and keyword coverage. Only
 * the rewrite *suggestions* depend on the model.
 */
export function runSeoAudit(input: OptimizeSeoInput): {
  seoScore: number;
  issues: SeoIssue[];
  keywords: { found: string[]; missing: string[] };
} {
  const issues: SeoIssue[] = [];

  const title = (input.title ?? "").trim();
  const description = stripHtml(input.description ?? "");
  const tags = normalizeTags(input.tags);
  const keywords = normalizeTags(input.targetKeywords).map((k) => k.toLowerCase());

  // Start at 100 and deduct for each problem found.
  let score = 100;

  // ── Title checks ──
  if (title.length === 0) {
    issues.push({ field: "title", severity: "high", message: "Title is missing." });
    score -= 30;
  } else {
    if (title.length < TITLE_MIN) {
      issues.push({
        field: "title",
        severity: "medium",
        message: `Title is short (${title.length} chars). Aim for ${TITLE_MIN}-${TITLE_MAX} so it reads well and fills the search snippet.`,
      });
      score -= 12;
    } else if (title.length > TITLE_MAX) {
      issues.push({
        field: "title",
        severity: "low",
        message: `Title is long (${title.length} chars) and may get truncated in search results. Trim toward ${TITLE_MAX}.`,
      });
      score -= 6;
    }

    const letters = title.replace(/[^a-zA-Z]/g, "");
    if (letters.length >= 6 && title === title.toUpperCase()) {
      issues.push({
        field: "title",
        severity: "medium",
        message: "Title is in ALL CAPS, which reads as spam. Use title case.",
      });
      score -= 10;
    }

    if (/[!?]{2,}|\*{2,}|\.{3,}/.test(title)) {
      issues.push({
        field: "title",
        severity: "low",
        message: "Title has excessive punctuation. Keep it clean for a professional snippet.",
      });
      score -= 4;
    }
  }

  // ── Description checks ──
  if (description.length === 0) {
    issues.push({
      field: "description",
      severity: "high",
      message: "Description is missing. Search engines use it for the meta snippet.",
    });
    score -= 25;
  } else if (description.length < META_MIN) {
    issues.push({
      field: "description",
      severity: "medium",
      message: `Description is thin (${description.length} chars). Aim for at least ${META_MIN} to give shoppers and search engines enough context.`,
    });
    score -= 12;
  }

  // ── Tag checks ──
  if (tags.length < TAGS_MIN) {
    issues.push({
      field: "tags",
      severity: tags.length === 0 ? "medium" : "low",
      message: `Only ${tags.length} tag(s). Add ${TAGS_MIN}-${TAGS_MAX} relevant tags to improve discoverability.`,
    });
    score -= tags.length === 0 ? 12 : 6;
  } else if (tags.length > TAGS_MAX) {
    issues.push({
      field: "tags",
      severity: "low",
      message: `${tags.length} tags may dilute relevance. Keep the ${TAGS_MAX} most relevant.`,
    });
    score -= 4;
  }

  // ── Keyword coverage ──
  const found: string[] = [];
  const missing: string[] = [];
  if (keywords.length > 0) {
    const haystack = `${title} ${description} ${tags.join(" ")}`.toLowerCase();
    for (const keyword of keywords) {
      if (haystack.includes(keyword)) {
        found.push(keyword);
      } else {
        missing.push(keyword);
      }
    }

    if (missing.length > 0) {
      issues.push({
        field: "keywords",
        severity: missing.length === keywords.length ? "high" : "medium",
        message: `Target keyword(s) not found in the listing: ${missing.join(", ")}.`,
      });
      score -= Math.min(20, missing.length * 8);
    }
  }

  return {
    seoScore: clampScore(score),
    issues,
    keywords: { found, missing },
  };
}

function validateInput(input: OptimizeSeoInput): ToolExecutionResult<never> | null {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid seo payload.",
      error: { code: "INVALID_INPUT", details: "Input must be an object." },
    };
  }

  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return {
      status: "error",
      message: "title is required.",
      error: {
        code: "INVALID_TITLE",
        details: "`title` (the product's listing title) must be a non-empty string.",
      },
    };
  }

  return null;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max - 1).trimEnd() + "…";
}

export function buildMockSuggestions(
  input: OptimizeSeoInput,
): OptimizeSeoOutput["suggestions"] & { contentIdeas: string[] } {
  const base = (input.productName ?? input.title).trim();
  const keywords = normalizeTags(input.targetKeywords);
  const primaryKeyword = keywords[0] ?? "premium";

  const improvedTitle = truncate(
    `${base} | ${primaryKeyword} ${keywords[1] ?? "essential"}`.replace(/\s+/g, " "),
    TITLE_MAX,
  );

  const metaDescription = truncate(
    `Shop the ${base.toLowerCase()} — ${primaryKeyword} quality built for everyday use. Fast shipping and easy returns.`,
    META_MAX,
  );

  const tags = Array.from(
    new Set(
      [...keywords, base, "premium", "bestseller", "gift idea"]
        .map((t) => t.toLowerCase().trim())
        .filter(Boolean),
    ),
  ).slice(0, TAGS_MAX);

  return {
    title: improvedTitle,
    metaDescription,
    tags,
    altText: `${base} product photo on a clean background`,
    contentIdeas: [
      `How to choose the right ${base.toLowerCase()}`,
      `${base}: care tips and styling ideas`,
      `Why shoppers love the ${base.toLowerCase()}`,
    ],
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

function parseGeminiJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

async function suggestWithGemini(
  input: OptimizeSeoInput,
  audit: { issues: SeoIssue[] },
): Promise<OptimizeSeoOutput["suggestions"] & { contentIdeas: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const prompt = [
    "You are an ecommerce SEO specialist improving a product listing.",
    "Here is the current listing and the issues an audit found:",
    JSON.stringify({
      title: input.title,
      description: input.description ?? "",
      tags: normalizeTags(input.tags),
      targetKeywords: normalizeTags(input.targetKeywords),
      issues: audit.issues,
    }),
    "Return valid JSON only with this exact schema:",
    "{",
    '  "title": string,',
    '  "metaDescription": string,',
    '  "tags": string[],',
    '  "altText": string,',
    '  "contentIdeas": string[]',
    "}",
    "Constraints:",
    `- title <= ${TITLE_MAX} chars, naturally includes the main target keyword`,
    `- metaDescription between ${META_MIN} and ${META_MAX} chars`,
    `- tags: ${TAGS_MIN}-${TAGS_MAX} concise, relevant tags`,
    "- altText: one short, descriptive sentence for the product image",
    "- contentIdeas: 2-4 blog/post ideas that would drive traffic to this product",
    "- fix the issues listed above; keep it truthful to the product",
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}).`);
  }

  const data = (await response.json()) as GeminiTextResponse;
  const parsed = parseGeminiJson<OptimizeSeoOutput["suggestions"] & { contentIdeas: string[] }>(
    extractText(data),
  );

  if (!parsed) {
    throw new Error("Gemini did not return parseable JSON.");
  }

  // Normalize / clamp to the SEO constraints regardless of what the model returned.
  return {
    title: truncate((parsed.title || input.title).trim(), TITLE_MAX),
    metaDescription: truncate(
      (parsed.metaDescription || "").trim(),
      META_MAX,
    ),
    tags: normalizeTags(parsed.tags).slice(0, TAGS_MAX),
    altText: (parsed.altText || `${input.title} product photo`).trim(),
    contentIdeas: normalizeTags(parsed.contentIdeas).slice(0, 4),
  };
}

export async function optimizeSeo(
  input: OptimizeSeoInput,
): Promise<ToolExecutionResult<OptimizeSeoOutput>> {
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  // Recover the real product name if the model passed the user's request as the title.
  input = normalizeSeoInput(input);

  // The audit (score, issues, keyword coverage) is deterministic and always runs.
  const audit = runSeoAudit(input);
  const label = (input.productName ?? input.title).trim();

  // Only the rewrite suggestions need the model; fall back to mock if it's
  // unavailable so the tool still returns a useful, complete result.
  let suggestions: OptimizeSeoOutput["suggestions"] & { contentIdeas: string[] };
  let degraded: { code: string; details: string } | null = null;

  if (isMockModeEnabled()) {
    suggestions = buildMockSuggestions(input);
  } else {
    try {
      suggestions = await suggestWithGemini(input, audit);
    } catch (error) {
      suggestions = buildMockSuggestions(input);
      degraded = {
        code: "OPTIMIZE_SEO_SUGGESTIONS_FALLBACK_USED",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const { contentIdeas, ...rewrite } = suggestions;

  return {
    status: "success",
    message: `seo audit complete for "${label}" — score ${audit.seoScore}/100.`,
    data: {
      seoScore: audit.seoScore,
      issues: audit.issues,
      keywords: audit.keywords,
      suggestions: rewrite,
      contentIdeas,
    },
    ...(degraded && { error: degraded }),
  };
}
