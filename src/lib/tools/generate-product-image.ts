import { ToolExecutionResult } from "@/lib/tools/types";

export interface GenerateProductImageInput {
  prompt: string;
  style?: "studio" | "lifestyle" | "minimal" | "bold";
  aspectRatio?: "1:1" | "4:5" | "16:9";
  seed?: number;
}

export interface GenerateProductImageOutput {
  imageUrl: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  provider: "pollinations" | "mock";
}

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ");
}

function styleHint(style: GenerateProductImageInput["style"]): string {
  switch (style) {
    case "studio":
      return "clean studio product lighting, high detail";
    case "lifestyle":
      return "lifestyle ecommerce scene, natural lighting";
    case "minimal":
      return "minimal composition, neutral palette";
    case "bold":
      return "bold branding, high contrast, vibrant colors";
    default:
      return "ecommerce-ready product photography";
  }
}

function ratioToSize(aspectRatio: GenerateProductImageInput["aspectRatio"]): string {
  switch (aspectRatio) {
    case "4:5":
      return "1024x1280";
    case "16:9":
      return "1280x720";
    case "1:1":
    default:
      return "1024x1024";
  }
}

export async function generateProductImage(
  input: GenerateProductImageInput,
): Promise<ToolExecutionResult<GenerateProductImageOutput>> {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid image payload.",
      error: {
        code: "INVALID_INPUT",
        details: "Input must be an object.",
      },
    };
  }

  if (typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
    return {
      status: "error",
      message: "prompt is required.",
      error: {
        code: "INVALID_PROMPT",
        details: "`prompt` must be a non-empty string.",
      },
    };
  }

  const normalizedPrompt = normalizePrompt(input.prompt);
  const style = input.style ?? "studio";
  const aspectRatio = input.aspectRatio ?? "1:1";
  const size = ratioToSize(aspectRatio);
  const seed = Number.isFinite(input.seed) ? Math.floor(input.seed as number) : Date.now();

  if (isMockModeEnabled()) {
    return {
      status: "success",
      message: "mock mode: generated product image URL.",
      data: {
        imageUrl: `https://picsum.photos/seed/${seed}/1024/1024`,
        prompt: normalizedPrompt,
        style,
        aspectRatio,
        provider: "mock",
      },
    };
  }

  const composedPrompt = `${normalizedPrompt}, ${styleHint(style)}`;
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(composedPrompt)}?width=${size.split("x")[0]}&height=${size.split("x")[1]}&seed=${seed}&nologo=true`;

  return {
    status: "success",
    message: "generated product image URL.",
    data: {
      imageUrl,
      prompt: normalizedPrompt,
      style,
      aspectRatio,
      provider: "pollinations",
    },
  };
}
