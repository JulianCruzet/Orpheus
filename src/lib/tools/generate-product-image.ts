import { ToolExecutionResult } from "@/lib/tools/types";
import { storeImage } from "@/lib/tools/image-store";

export interface GenerateProductImageInput {
  prompt: string;
  style?: "studio" | "lifestyle" | "minimal" | "bold";
  aspectRatio?: "1:1" | "4:5" | "16:9";
  seed?: number;
}

export interface GenerateProductImageOutput {
  imageId: string;
  imageUrl: string;
  base64Data: string;
  mimeType: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  provider: "gemini" | "mock";
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
      return "clean studio product photography, white background, high detail, professional lighting";
    case "lifestyle":
      return "lifestyle ecommerce scene, natural lighting, worn by model";
    case "minimal":
      return "minimal composition, neutral palette, flat lay";
    case "bold":
      return "bold branding, high contrast, vibrant colors, graphic design";
    default:
      return "ecommerce-ready product photography, clean background";
  }
}

export async function generateProductImage(
  input: GenerateProductImageInput,
): Promise<ToolExecutionResult<GenerateProductImageOutput>> {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid image payload.",
      error: { code: "INVALID_INPUT", details: "Input must be an object." },
    };
  }

  if (typeof input.prompt !== "string" || input.prompt.trim().length === 0) {
    return {
      status: "error",
      message: "prompt is required.",
      error: { code: "INVALID_PROMPT", details: "`prompt` must be a non-empty string." },
    };
  }

  const normalizedPrompt = normalizePrompt(input.prompt);
  const style = input.style ?? "studio";
  const aspectRatio = input.aspectRatio ?? "1:1";

  if (isMockModeEnabled()) {
    const seed = Number.isFinite(input.seed) ? Math.floor(input.seed as number) : Date.now();
    return {
      status: "success",
      message: "mock mode: generated product image URL.",
      data: {
        imageId: `mock_${seed}`,
        imageUrl: `https://picsum.photos/seed/${seed}/1024/1024`,
        base64Data: "",
        mimeType: "image/jpeg",
        prompt: normalizedPrompt,
        style,
        aspectRatio,
        provider: "mock",
      },
    };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: "error",
      message: "gemini api key not configured.",
      error: { code: "MISSING_API_KEY", details: "GEMINI_API_KEY is not set." },
    };
  }

  try {
    const composedPrompt = `${normalizedPrompt}, ${styleHint(style)}, clipart style, flat vector illustration, transparent background, no background, PNG with alpha channel, clean edges, high quality`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: composedPrompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini image API ${response.status}: ${errText}`);
    }

    const json = await response.json() as {
      candidates: Array<{
        content: { parts: Array<{ inlineData?: { data: string; mimeType: string } }> };
      }>;
    };

    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart?.inlineData) {
      return {
        status: "error",
        message: "gemini did not return an image.",
        error: { code: "NO_IMAGE_RETURNED", details: "No image data in response." },
      };
    }

    let base64Data = imagePart.inlineData.data;
    let mimeType = imagePart.inlineData.mimeType ?? "image/png";

    // Remove background via remove.bg if API key is configured
    const removeBgKey = process.env.REMOVE_BG_API_KEY?.trim();
    if (removeBgKey) {
      try {
        const imageBuffer = Buffer.from(base64Data, "base64");
        const blob = new Blob([imageBuffer], { type: mimeType });

        const formData = new FormData();
        formData.append("image_file", blob, "image.png");
        formData.append("size", "auto");

        const bgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: { "X-Api-Key": removeBgKey },
          body: formData,
        });

        if (bgRes.ok) {
          const buf = await bgRes.arrayBuffer();
          base64Data = Buffer.from(buf).toString("base64");
          mimeType = "image/png";
        }
      } catch {
        // Non-fatal: use original image if remove.bg fails
      }
    }

    const imageId = storeImage(base64Data, mimeType);

    return {
      status: "success",
      message: "generated product image with gemini.",
      data: {
        imageId,
        imageUrl: `/api/images/${imageId}`,
        base64Data: "",
        mimeType,
        prompt: normalizedPrompt,
        style,
        aspectRatio,
        provider: "gemini",
      },
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      message: "image generation failed.",
      error: { code: "GEMINI_IMAGE_FAILED", details },
    };
  }
}
