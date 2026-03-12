import { createShopifyClientFromEnv, ShopifyClient } from "@/lib/shopify/client";
import { ToolExecutionResult } from "@/lib/tools/types";

export interface ShopifyCreateProductInput {
  title: string;
  descriptionHtml?: string;
  description?: string;    // alias — Gemini sends this from schema
  vendor?: string;
  productType?: string;
  tags?: string[];
  price?: number;
  status?: "active" | "draft" | "archived";
  imageUrls?: string[];
  imageAttachments?: Array<{ base64Data: string; mimeType: string; filename?: string }>;
}

export interface ShopifyCreatedProduct {
  id: number;
  title: string;
  status: string;
  handle: string;
  vendor: string;
}

interface ShopifyCreateProductResponse {
  product: {
    id: number;
    title: string;
    status?: string;
    handle?: string;
    vendor?: string;
  };
}

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

function normalizeTags(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) {
    return "";
  }

  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .join(", ");
}

function validateInput(
  input: ShopifyCreateProductInput,
): ToolExecutionResult<never> | null {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid create product payload.",
      error: {
        code: "INVALID_INPUT",
        details: "Input must be an object.",
      },
    };
  }

  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return {
      status: "error",
      message: "product title is required.",
      error: {
        code: "INVALID_TITLE",
        details: "`title` must be a non-empty string.",
      },
    };
  }

  if (input.price !== undefined) {
    if (!Number.isFinite(input.price) || input.price < 0) {
      return {
        status: "error",
        message: "price must be a non-negative number.",
        error: {
          code: "INVALID_PRICE",
          details: "`price` must be a finite number >= 0.",
        },
      };
    }
  }

  return null;
}

async function createProduct(
  client: ShopifyClient,
  input: ShopifyCreateProductInput,
): Promise<ShopifyCreatedProduct> {
  const body = {
    product: {
      title: input.title.trim(),
      body_html: input.descriptionHtml,
      vendor: input.vendor,
      product_type: input.productType,
      tags: normalizeTags(input.tags),
      status: input.status ?? "active",
      variants:
        input.price !== undefined
          ? [{ price: input.price.toFixed(2) }]
          : undefined,
      images: [
        ...(input.imageUrls ?? []).map((src) => ({ src })),
        ...(input.imageAttachments ?? []).map((att, i) => ({
          attachment: att.base64Data,
          filename: att.filename ?? `product-image-${i + 1}.${att.mimeType.split("/")[1] ?? "png"}`,
        })),
      ].length > 0
        ? [
            ...(input.imageUrls ?? []).map((src) => ({ src })),
            ...(input.imageAttachments ?? []).map((att, i) => ({
              attachment: att.base64Data,
              filename: att.filename ?? `product-image-${i + 1}.${att.mimeType.split("/")[1] ?? "png"}`,
            })),
          ]
        : undefined,
    },
  };

  const response = await client.request<ShopifyCreateProductResponse>(
    "/products.json",
    {
      method: "POST",
      body,
    },
  );

  return {
    id: response.product.id,
    title: response.product.title,
    status: response.product.status ?? input.status ?? "active",
    handle: response.product.handle ?? "",
    vendor: response.product.vendor ?? input.vendor ?? "",
  };
}

function mockCreatedProduct(input: ShopifyCreateProductInput): ShopifyCreatedProduct {
  return {
    id: Math.floor(Math.random() * 900000) + 100000,
    title: input.title.trim(),
    status: input.status ?? "active",
    handle: input.title.trim().toLowerCase().replace(/\s+/g, "-"),
    vendor: input.vendor ?? "Orpheus",
  };
}

export async function shopifyCreateProduct(
  input: ShopifyCreateProductInput,
): Promise<ToolExecutionResult<ShopifyCreatedProduct>> {
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  // Normalize description → descriptionHtml (schema sends `description`)
  if (!input.descriptionHtml && input.description) {
    input.descriptionHtml = input.description;
  }

  if (isMockModeEnabled()) {
    const created = mockCreatedProduct(input);

    return {
      status: "success",
      message: `created mock product \"${created.title}\".`,
      data: created,
    };
  }

  try {
    const client = createShopifyClientFromEnv();
    const created = await createProduct(client, input);

    return {
      status: "success",
      message: `created product \"${created.title}\" in shopify.`,
      data: created,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "error",
      message: "unable to create product right now.",
      error: {
        code: "SHOPIFY_CREATE_PRODUCT_FAILED",
        details,
      },
    };
  }
}
