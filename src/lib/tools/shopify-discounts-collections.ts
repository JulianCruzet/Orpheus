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

function isValidInput(
  input: unknown,
): input is ManageDiscountsAndCollectionsInput {
  if (!input || typeof input !== "object") {
    return false;
  }

  const parsed = input as Partial<ManageDiscountsAndCollectionsInput>;

  return (
    (parsed.target === "discount" || parsed.target === "collection") &&
    (parsed.action === "list" || parsed.action === "create")
  );
}

export async function shopifyDiscountsAndCollections(
  input: unknown,
): Promise<ToolExecutionResult<DiscountsAndCollectionsData>> {
  if (!isValidInput(input)) {
    return {
      status: "error",
      message: "Invalid input for discounts/collections tool.",
      error: {
        code: "INVALID_INPUT",
        details:
          "Expected { target: 'discount'|'collection', action: 'list'|'create', payload?: object }.",
      },
    };
  }

  const client = createShopifyClientFromEnv();

  if (input.target === "discount" && input.action === "list") {
    const response = await client.request<ShopifyPriceRulesResponse>(
      "/price_rules.json?limit=25",
    );

    return {
      status: "success",
      message: "Fetched Shopify discount rules.",
      data: {
        target: input.target,
        action: input.action,
        result: response.price_rules,
      },
    };
  }

  if (input.target === "discount" && input.action === "create") {
    const response = await client.request<{ price_rule: unknown }>(
      "/price_rules.json",
      {
        method: "POST",
        body: {
          price_rule: input.payload ?? {},
        },
      },
    );

    return {
      status: "success",
      message: "Created Shopify discount rule.",
      data: {
        target: input.target,
        action: input.action,
        result: response.price_rule,
      },
    };
  }

  if (input.target === "collection" && input.action === "list") {
    const response = await client.request<ShopifyCustomCollectionsResponse>(
      "/custom_collections.json?limit=25",
    );

    return {
      status: "success",
      message: "Fetched Shopify collections.",
      data: {
        target: input.target,
        action: input.action,
        result: response.custom_collections,
      },
    };
  }

  const response = await client.request<{ custom_collection: unknown }>(
    "/custom_collections.json",
    {
      method: "POST",
      body: {
        custom_collection: input.payload ?? {},
      },
    },
  );

  return {
    status: "success",
    message: "Created Shopify collection.",
    data: {
      target: input.target,
      action: input.action,
      result: response.custom_collection,
    },
  };
}
