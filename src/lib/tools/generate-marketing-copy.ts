import { ToolExecutionResult } from "@/lib/tools/types";

export interface GenerateMarketingCopyInput {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
  tone?: "excited" | "professional" | "playful" | "luxury" | "urgent";
  platforms?: Array<"instagram" | "email" | "facebook_ad" | "twitter">;
}

export interface GenerateMarketingCopyOutput {
  productName: string;
  instagram?: { captions: string[] };
  email?: { subject: string; body: string };
  facebook_ad?: { headline: string; primaryText: string; callToAction: string };
  twitter?: { posts: string[] };
}

interface GeminiTextResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

function extractText(response: GeminiTextResponse): string {
  return (
    response.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function parseJson(text: string): GenerateMarketingCopyOutput | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as GenerateMarketingCopyOutput;
  } catch {
    return null;
  }
}

function buildMockOutput(input: GenerateMarketingCopyInput): GenerateMarketingCopyOutput {
  const name = input.productName;
  const platforms = input.platforms ?? ["instagram", "email", "facebook_ad", "twitter"];
  const out: GenerateMarketingCopyOutput = { productName: name };

  if (platforms.includes("instagram")) {
    out.instagram = {
      captions: [
        `✨ Introducing ${name} — your new favorite. Shop now via link in bio! #NewDrop #ShopNow`,
        `We made ${name} for people who don't settle. Are you one of them? 🔥 #MustHave`,
        `The ${name} is here and it's everything. Tap to grab yours before it's gone. 🛒`,
      ],
    };
  }
  if (platforms.includes("email")) {
    out.email = {
      subject: `🚀 ${name} is live — don't miss out`,
      body: `Hey there,\n\nWe're thrilled to announce the launch of ${name}.\n\n${input.productDescription ?? `${name} is designed for people who want the best.`}\n\nShop now and get yours before stock runs out.\n\n— The Team`,
    };
  }
  if (platforms.includes("facebook_ad")) {
    out.facebook_ad = {
      headline: `Meet ${name}`,
      primaryText: `${input.productDescription ?? `${name} — built for quality and style.`} Shop now and see why everyone's talking about it.`,
      callToAction: "Shop Now",
    };
  }
  if (platforms.includes("twitter")) {
    out.twitter = {
      posts: [
        `Just dropped: ${name} 🔥 grab yours before it sells out → [link]`,
        `${name} is live. No hype, just quality. Check it out → [link]`,
      ],
    };
  }

  return out;
}

async function generateWithGemini(
  input: GenerateMarketingCopyInput,
): Promise<GenerateMarketingCopyOutput> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");

  const platforms = input.platforms ?? ["instagram", "email", "facebook_ad", "twitter"];
  const tone = input.tone ?? "excited";
  const audience = input.targetAudience ?? "general shoppers";

  const schemaFields: string[] = [`"productName": string`];
  if (platforms.includes("instagram"))
    schemaFields.push(`"instagram": { "captions": string[] } // 3 captions, each with emojis and hashtags, under 220 chars`);
  if (platforms.includes("email"))
    schemaFields.push(`"email": { "subject": string, "body": string } // subject under 60 chars, body 3-4 short paragraphs`);
  if (platforms.includes("facebook_ad"))
    schemaFields.push(`"facebook_ad": { "headline": string, "primaryText": string, "callToAction": string } // headline under 40 chars`);
  if (platforms.includes("twitter"))
    schemaFields.push(`"twitter": { "posts": string[] } // 2 posts, each under 280 chars`);

  const prompt = [
    `You are an expert e-commerce marketing copywriter.`,
    `Generate marketing copy for the product below with a ${tone} tone targeting ${audience}.`,
    `Return ONLY valid JSON matching this schema exactly:`,
    `{ ${schemaFields.join(", ")} }`,
    `Product name: ${input.productName}`,
    input.productDescription ? `Product description: ${input.productDescription}` : "",
  ]
    .filter(Boolean)
    .join("\n");

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

  if (!response.ok) throw new Error(`Gemini request failed (${response.status}).`);

  const data = (await response.json()) as GeminiTextResponse;
  const text = extractText(data);
  const parsed = parseJson(text);

  if (!parsed) throw new Error("Gemini did not return parseable JSON.");

  return { ...parsed, productName: input.productName };
}

export async function generateMarketingCopy(
  input: GenerateMarketingCopyInput,
): Promise<ToolExecutionResult<GenerateMarketingCopyOutput>> {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid input.",
      error: { code: "INVALID_INPUT", details: "Input must be an object." },
    };
  }

  if (typeof input.productName !== "string" || input.productName.trim().length === 0) {
    return {
      status: "error",
      message: "productName is required.",
      error: { code: "INVALID_PRODUCT_NAME", details: "`productName` must be a non-empty string." },
    };
  }

  try {
    const output = isMockModeEnabled()
      ? buildMockOutput(input)
      : await generateWithGemini(input);

    const platforms = input.platforms ?? ["instagram", "email", "facebook_ad", "twitter"];
    return {
      status: "success",
      message: `generated marketing copy for "${input.productName.trim()}" across ${platforms.join(", ")}.`,
      data: output,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      message: "unable to generate marketing copy right now.",
      error: { code: "GENERATE_MARKETING_COPY_FAILED", details },
    };
  }
}
