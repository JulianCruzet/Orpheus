import { createShopifyClientFromEnv } from "@/lib/shopify/client";
import { ToolExecutionResult } from "@/lib/tools/types";

type ManageDiscountsAndCollectionsInput = {
  target: "discount" | "collection";
  action: "list" | "create";
  payload?: Record<string, unknown>;
};

type DiscountsAndCollectionsData = {
  target: "discount" | "collection";
  action: "list" | "create";
  result: unknown;
};

type ShopifyPriceRulesResponse = {
  price_rules: unknown[];
};

type ShopifyCustomCollectionsResponse = {
  custom_collections: unknown[];
};

// Normalize schema actions like "list_discounts" → { target: "discount", action: "list" }
function normalizeInput(input: unknown): ManageDiscountsAndCollectionsInput | null {
  if (!input || typeof input !== "object") return null;

  const raw = input as Record<string, unknown>;

  // Already in correct format
  if (
    (raw.target === "discount" || raw.target === "collection") &&
    (raw.action === "list" || raw.action === "create")
  ) {
    return raw as ManageDiscountsAndCollectionsInput;
  }

  // Schema sends combined action strings like "list_discounts", "create_collection"
  const action = typeof raw.action === "string" ? raw.action : "";
  const mapping: Record<string, { target: "discount" | "collection"; action: "list" | "create" }> = {
    list_discounts: { target: "discount", action: "list" },
    create_discount: { target: "discount", action: "create" },
    list_collections: { target: "collection", action: "list" },
    create_collection: { target: "collection", action: "create" },
  };

  const mapped = mapping[action];
  if (!mapped) return null;

  return { ...mapped, payload: raw.payload as Record<string, unknown> ?? raw };
}

export async function shopifyDiscountsAndCollections(
  input: unknown,
): Promise<ToolExecutionResult<DiscountsAndCollectionsData>> {
  const normalized = normalizeInput(input);
  if (!normalized) {
    return {
      status: "error",
      message: "Invalid input for discounts/collections tool.",
      error: {
        code: "INVALID_INPUT",
        details:
          "Expected action: 'list_discounts', 'create_discount', 'list_collections', or 'create_collection'.",
      },
    };
  }

  // Replace input reference for downstream use
  const validInput = normalized;

  try {
    const client = createShopifyClientFromEnv();

    if (validInput.target === "discount" && validInput.action === "list") {
      const response = await client.request<ShopifyPriceRulesResponse>(
        "/price_rules.json?limit=25",
      );

      return {
        status: "success",
        message: "Fetched Shopify discount rules.",
        data: {
          target: validInput.target,
          action: validInput.action,
          result: response.price_rules,
        },
      };
    }

    if (validInput.target === "discount" && validInput.action === "create") {
      const response = await client.request<{ price_rule: unknown }>(
        "/price_rules.json",
        {
          method: "POST",
          body: {
            price_rule: validInput.payload ?? {},
          },
        },
      );

      return {
        status: "success",
        message: "Created Shopify discount rule.",
        data: {
          target: validInput.target,
          action: validInput.action,
          result: response.price_rule,
        },
      };
    }

    if (validInput.target === "collection" && validInput.action === "list") {
      const response = await client.request<ShopifyCustomCollectionsResponse>(
        "/custom_collections.json?limit=25",
      );

      return {
        status: "success",
        message: "Fetched Shopify collections.",
        data: {
          target: validInput.target,
          action: validInput.action,
          result: response.custom_collections,
        },
      };
    }

    const response = await client.request<{ custom_collection: unknown }>(
      "/custom_collections.json",
      {
        method: "POST",
        body: {
          custom_collection: validInput.payload ?? {},
        },
      },
    );

    return {
      status: "success",
      message: "Created Shopify collection.",
      data: {
        target: validInput.target,
        action: validInput.action,
        result: response.custom_collection,
      },
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      message: "failed to manage discounts/collections.",
      error: { code: "SHOPIFY_DISCOUNTS_COLLECTIONS_FAILED", details },
    };
  }
}
