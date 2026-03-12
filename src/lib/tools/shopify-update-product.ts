import { createShopifyClientFromEnv, ShopifyClient } from "@/lib/shopify/client";
import { ToolExecutionResult } from "@/lib/tools/types";

export interface ShopifyUpdateProductInput {
  id?: number;
  productId?: string | number;
  title?: string;
  bodyHtml?: string;
  description?: string;      // alias for bodyHtml (Gemini may send this)
  tags?: string[];
  status?: "active" | "draft" | "archived";
  vendor?: string;
  price?: number;
}

interface ShopifyUpdateProductResponse {
  product: {
    id: number;
    title: string;
    body_html?: string;
    status?: string;
    tags?: string;
    vendor?: string;
  };
}

interface ShopifyGetProductResponse {
  product: {
    id: number;
    title: string;
    body_html?: string;
    status?: string;
    tags?: string;
    vendor?: string;
  };
}

interface UndoPayload {
  id: number;
  title?: string;
  bodyHtml?: string;
  status?: string;
  vendor?: string;
  tags?: string[];
}

interface ShopifyUpdateProductOutput {
  product: ShopifyUpdateProductResponse["product"];
  undo: {
    tool: "shopify_update_product";
    input: UndoPayload;
    summary: string;
  };
}

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

function hasUpdatableFields(input: ShopifyUpdateProductInput): boolean {
  return Boolean(
    input.title ?? input.bodyHtml ?? input.status ?? input.vendor ?? input.tags ?? input.price,
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
      ...(input.price != null ? { variants: [{ price: input.price.toFixed(2) }] } : {}),
    },
  };
}

function splitTags(tags?: string): string[] {
  if (!tags?.trim()) {
    return [];
  }

  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildUndoPayload(
  before: ShopifyGetProductResponse["product"],
  requestedUpdate: ShopifyUpdateProductInput,
): UndoPayload {
  const undo: UndoPayload = { id: before.id };

  if ("title" in requestedUpdate) {
    undo.title = before.title;
  }

  if ("bodyHtml" in requestedUpdate) {
    undo.bodyHtml = before.body_html;
  }

  if ("status" in requestedUpdate) {
    undo.status = before.status;
  }

  if ("vendor" in requestedUpdate) {
    undo.vendor = before.vendor;
  }

  if ("tags" in requestedUpdate) {
    undo.tags = splitTags(before.tags);
  }

  return undo;
}

async function getProduct(
  client: ShopifyClient,
  id: number,
): Promise<ShopifyGetProductResponse["product"]> {
  const response = await client.request<ShopifyGetProductResponse>(
    `/products/${id}.json`,
  );

  return response.product;
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
): Promise<ToolExecutionResult<ShopifyUpdateProductOutput>> {
  // Normalize productId → id (schema sends productId, handler expects id)
  if (!input.id && input.productId != null) {
    input.id = typeof input.productId === "string" ? parseInt(input.productId, 10) : input.productId;
  }
  // Normalize description → bodyHtml
  if (!input.bodyHtml && input.description) {
    input.bodyHtml = input.description;
  }

  if (!Number.isFinite(input?.id) || (input.id as number) <= 0) {
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
    const product = {
      id: input.id as number,
      title: input.title ?? "Mock Product",
      body_html: input.bodyHtml,
      status: input.status ?? "active",
      tags: input.tags?.join(", "),
      vendor: input.vendor ?? "Orpheus",
    };

    return {
      status: "success",
      message: `mock update complete for product ${input.id}. you can undo with the returned payload.`,
      data: {
        product,
        undo: {
          tool: "shopify_update_product",
          input: {
            id: input.id as number,
            title: "Mock Product",
            bodyHtml: "Mock description",
            status: "active",
            vendor: "Orpheus",
            tags: ["mock", "demo"],
          },
          summary: "run shopify_update_product with this input to restore previous values.",
        },
      },
    };
  }

  try {
    const client = createShopifyClientFromEnv();
    const previous = await getProduct(client, input.id as number);
    const product = await updateProduct(client, input);
    const undoInput = buildUndoPayload(previous, input);

    return {
      status: "success",
      message: `updated product ${product.id}. undo data included for reversible fields.`,
      data: {
        product,
        undo: {
          tool: "shopify_update_product",
          input: undoInput,
          summary: "run shopify_update_product with this input to revert this change.",
        },
      },
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
