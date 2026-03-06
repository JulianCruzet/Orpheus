import { createShopifyClientFromEnv, ShopifyClient } from "@/lib/shopify/client";
import { ToolExecutionResult } from "@/lib/tools/types";

export interface ShopifyUpdateProductInput {
  id: number;
  title?: string;
  bodyHtml?: string;
  tags?: string[];
  status?: "active" | "draft" | "archived";
  vendor?: string;
}

interface ShopifyUpdateProductResponse {
  product: {
    id: number;
    title: string;
    status?: string;
    tags?: string;
    vendor?: string;
  };
}

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

function hasUpdatableFields(input: ShopifyUpdateProductInput): boolean {
  return Boolean(
    input.title ?? input.bodyHtml ?? input.status ?? input.vendor ?? input.tags,
  );
}

function normalizePayload(input: ShopifyUpdateProductInput): Record<string, unknown> {
  return {
    product: {
      id: input.id,
      ...(input.title ? { title: input.title } : {}),
      ...(input.bodyHtml ? { body_html: input.bodyHtml } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.vendor ? { vendor: input.vendor } : {}),
      ...(input.tags ? { tags: input.tags.join(", ") } : {}),
    },
  };
}

async function updateProduct(
  client: ShopifyClient,
  input: ShopifyUpdateProductInput,
): Promise<ShopifyUpdateProductResponse["product"]> {
  const payload = normalizePayload(input);

  const response = await client.request<ShopifyUpdateProductResponse>(
    `/products/${input.id}.json`,
    {
      method: "PUT",
      body: payload,
    },
  );

  return response.product;
}

export async function shopifyUpdateProduct(
  input: ShopifyUpdateProductInput,
): Promise<ToolExecutionResult<ShopifyUpdateProductResponse["product"]>> {
  if (!Number.isFinite(input?.id) || input.id <= 0) {
    return {
      status: "error",
      message: "a valid product id is required.",
      error: {
        code: "INVALID_PRODUCT_ID",
      },
    };
  }

  if (!hasUpdatableFields(input)) {
    return {
      status: "error",
      message: "provide at least one field to update.",
      error: {
        code: "NO_UPDATE_FIELDS",
      },
    };
  }

  if (isMockModeEnabled()) {
    return {
      status: "success",
      message: `mock update complete for product ${input.id}.`,
      data: {
        id: input.id,
        title: input.title ?? "Mock Product",
        status: input.status ?? "active",
        tags: input.tags?.join(", "),
        vendor: input.vendor ?? "Shams-E",
      },
    };
  }

  try {
    const client = createShopifyClientFromEnv();
    const product = await updateProduct(client, input);

    return {
      status: "success",
      message: `updated product ${product.id}.`,
      data: product,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "error",
      message: "unable to update product right now.",
      error: {
        code: "SHOPIFY_UPDATE_PRODUCT_FAILED",
        details,
      },
    };
  }
}
