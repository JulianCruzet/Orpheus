import { executeMockTool, isMockModeEnabled } from "@/lib/tools/mock-tools";
import { toStructuredToolResult } from "@/lib/tools/structured-result";
import { generateProductListing } from "@/lib/tools/generate-product-listing";
import { shopifyCreateProduct } from "@/lib/tools/shopify-create-product";
import { shopifyListProducts } from "@/lib/tools/shopify-list-products";
import { shopifyUpdateProduct } from "@/lib/tools/shopify-update-product";
import { shopifyManageOrders } from "@/lib/tools/shopify-manage-orders";
import { shopifyManageInventory } from "@/lib/tools/shopify-manage-inventory";
import {
  StructuredToolResult,
  ToolDefinition,
  ToolRegistry,
} from "@/lib/tools/types";
import { researchMarket } from "@/lib/tools/research-market";
import { researchCompetitors } from "@/lib/tools/research-competitors";
import { generateProductImage } from "@/lib/tools/generate-product-image";
import { shopifyDiscountsAndCollections } from "@/lib/tools/shopify-discounts-collections";
import { analyzeStorePerformance } from "@/lib/tools/analyze-store-performance";
import { draftCustomerResponse } from "@/lib/tools/draft-customer-response";

const nowIso = (): string => new Date().toISOString();

function withToolLogging<TInput = unknown, TOutput = unknown>(
  toolName: string,
  handler: (input: TInput) => Promise<ToolExecutionResult<TOutput>>,
): (input: TInput) => Promise<ToolExecutionResult<TOutput>> {
  return async (input: TInput): Promise<ToolExecutionResult<TOutput>> => {
    const startedAt = nowIso();
    const startedTime = Date.now();

    console.info(`[tool:${toolName}] start`, { startedAt });

    try {
      const result = await handler(input);
      const finishedAt = nowIso();
      const durationMs = Date.now() - startedTime;

      console.info(`[tool:${toolName}] end`, {
        status: result.status,
        durationMs,
        startedAt,
        finishedAt,
      });

      return {
        ...result,
        meta: {
          ...(result.meta ?? {}),
          startedAt,
          finishedAt,
          durationMs,
        },
      };
    } catch (error) {
      const finishedAt = nowIso();
      const durationMs = Date.now() - startedTime;
      const details = error instanceof Error ? error.message : "Unknown error";

      console.error(`[tool:${toolName}] failed`, {
        durationMs,
        startedAt,
        finishedAt,
        details,
      });

      return {
        status: "error",
        message: `${toolName} failed unexpectedly.`,
        error: {
          code: "TOOL_EXECUTION_FAILED",
          details,
        },
        meta: {
          startedAt,
          finishedAt,
          durationMs,
        },
      };
    }
  };
}

export const toolRegistry: ToolRegistry = {
  shopify_list_products: {
    name: "shopify_list_products",
    description: "List products from the connected Shopify store.",
    handler: withToolLogging("shopify_list_products", shopifyListProducts),
  },
  shopify_create_product: {
    name: "shopify_create_product",
    description: "Create a new Shopify product.",
    handler: withToolLogging("shopify_create_product", shopifyCreateProduct),
  },
  shopify_update_product: {
    name: "shopify_update_product",
    description: "Update an existing Shopify product.",
    handler: withToolLogging("shopify_update_product", shopifyUpdateProduct),
  },
  shopify_manage_inventory: {
    name: "shopify_manage_inventory",
    description: "Read or update Shopify inventory counts.",
    handler: withToolLogging("shopify_manage_inventory", shopifyManageInventory),
  },
  shopify_manage_orders: {
    name: "shopify_manage_orders",
    description: "List or fetch Shopify order details.",
    handler: withToolLogging("shopify_manage_orders", shopifyManageOrders),
  },
  generate_product_listing: {
    name: "generate_product_listing",
    description: "Generate product listing content with AI.",
    handler: withToolLogging("generate_product_listing", generateProductListing),
  },
  research_market: {
    name: "research_market",
    description: "Research market trends and pricing opportunities.",
    handler: withToolLogging("research_market", researchMarket),
  },
  research_competitors: {
    name: "research_competitors",
    description: "Analyze competitor products and positioning.",
    handler: withToolLogging("research_competitors", researchCompetitors),
  },
  generate_product_image: {
    name: "generate_product_image",
    description: "Generate a product image URL from a text prompt.",
    handler: withToolLogging("generate_product_image", generateProductImage),
  },
  shopify_discounts_collections: {
    name: "shopify_discounts_collections",
    description:
      "Manage Shopify discounts and collections (list/create).",
    handler: withToolLogging(
      "shopify_discounts_collections",
      shopifyDiscountsAndCollections,
    ),
  },
  analyze_store_performance: {
    name: "analyze_store_performance",
    description: "Analyze store performance and return health insights.",
    handler: withToolLogging(
      "analyze_store_performance",
      analyzeStorePerformance,
    ),
  },
  draft_customer_response: {
    name: "draft_customer_response",
    description: "Draft a support reply to a customer message.",
    handler: withToolLogging(
      "draft_customer_response",
      draftCustomerResponse,
    ),
  },
};

export function getToolDefinition(
  toolName: string,
): ToolDefinition<unknown, unknown> | null {
  return toolRegistry[toolName] ?? null;
}

export function listToolDefinitions(): ToolDefinition<unknown, unknown>[] {
  return Object.values(toolRegistry);
}

export async function executeTool(
  toolName: string,
  input: unknown,
): Promise<StructuredToolResult<unknown>> {
  if (isMockModeEnabled()) {
    const mockResult = await executeMockTool(toolName, input);

    if (mockResult) {
      return toStructuredToolResult(toolName, mockResult);
    }
  }

  const toolDefinition = getToolDefinition(toolName);

  if (!toolDefinition) {
    return toStructuredToolResult(toolName, {
      status: "error",
      message: `${toolName} is not registered.`,
      error: {
        code: "TOOL_NOT_FOUND",
      },
    });
  }

  const executionResult = await toolDefinition.handler(input);
  return toStructuredToolResult(toolName, executionResult);
}
