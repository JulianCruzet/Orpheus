import { ToolExecutionResult } from "@/lib/tools/types";

export interface DraftCustomerResponseInput {
  customerMessage: string;
  customerName?: string;
  orderContext?: string;
  tone?: "empathetic" | "professional" | "friendly";
}

export interface DraftCustomerResponseOutput {
  subject: string;
  response: string;
  sentiment: "positive" | "neutral" | "negative";
  nextAction: string;
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

function validateInput(
  input: DraftCustomerResponseInput,
): ToolExecutionResult<null> | null {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid payload.",
      error: {
        code: "INVALID_INPUT",
        details: "Input must be an object.",
      },
    };
  }

  if (typeof input.customerMessage !== "string" || input.customerMessage.trim().length === 0) {
    return {
      status: "error",
      message: "customerMessage is required.",
      error: {
        code: "INVALID_CUSTOMER_MESSAGE",
        details: "`customerMessage` must be a non-empty string.",
      },
    };
  }

  return null;
}

function detectSentiment(message: string): "positive" | "neutral" | "negative" {
  const text = message.toLowerCase();

  if (/(angry|upset|refund|broken|late|bad|terrible|cancel)/.test(text)) {
    return "negative";
  }

  if (/(thanks|love|great|awesome|perfect|happy)/.test(text)) {
    return "positive";
  }

  return "neutral";
}

function buildMockOutput(
  input: DraftCustomerResponseInput,
): DraftCustomerResponseOutput {
  const name = input.customerName?.trim() || "there";
  const sentiment = detectSentiment(input.customerMessage);
  const tone = input.tone || "friendly";

  const opening =
    tone === "empathetic"
      ? `hi ${name}, thank you for reaching out and sharing this with us.`
      : tone === "professional"
        ? `hello ${name}, thank you for contacting our support team.`
        : `hi ${name}, thanks for your message.`;

  const nextAction =
    sentiment === "negative"
      ? "Offer a concrete resolution path (replacement/refund/timeline)."
      : "Confirm details and invite follow-up questions.";

  return {
    subject: "Re: your recent message",
    response: `${opening} we reviewed your note and want to help right away. ${
      input.orderContext ? `context we have: ${input.orderContext}. ` : ""
    }our team is on it and we will keep you updated until this is fully resolved.`,
    sentiment,
    nextAction,
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

function parseGeminiJson(text: string): DraftCustomerResponseOutput | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as DraftCustomerResponseOutput;
  } catch {
    return null;
  }
}

async function generateWithGemini(
  input: DraftCustomerResponseInput,
): Promise<DraftCustomerResponseOutput> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const prompt = [
    "You draft ecommerce customer support responses.",
    "Return valid JSON only with this exact schema:",
    "{",
    '  "subject": string,',
    '  "response": string,',
    '  "sentiment": "positive" | "neutral" | "negative",',
    '  "nextAction": string',
    "}",
    "Constraints:",
    "- response should be concise and brand-safe",
    "- never admit legal fault",
    "- if complaint is negative, include a concrete next step",
    "Input:",
    JSON.stringify(input),
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

  return parsed;
}

export async function draftCustomerResponse(
  input: DraftCustomerResponseInput,
): Promise<ToolExecutionResult<DraftCustomerResponseOutput>> {
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
      message: "drafted customer response.",
      data: output,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "error",
      message: "unable to draft customer response right now.",
      error: {
        code: "DRAFT_CUSTOMER_RESPONSE_FAILED",
        details,
      },
    };
  }
}
