import {
  ToolDefinition,
  ToolExecutionResult,
  ToolRegistry,
} from "@/lib/tools/types";

type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
) => Promise<ToolExecutionResult<TOutput>>;

async function runMockHandler<TInput>(
  toolName: string,
  input: TInput,
): Promise<ToolExecutionResult<{ tool: string; input: TInput }>> {
  return {
    status: "success",
    message: `${toolName} executed in mock mode`,
    data: {
      tool: toolName,
      input,
    },
  };
}

const handlers: Record<string, ToolHandler> = {
  generate_product_listing: async (input) =>
    runMockHandler("generate_product_listing", input),
  research_market: async (input) => runMockHandler("research_market", input),
  research_competitors: async (input) =>
    runMockHandler("research_competitors", input),
  shopify_list_products: async (input) =>
    runMockHandler("shopify_list_products", input),
  shopify_create_product: async (input) =>
    runMockHandler("shopify_create_product", input),
  shopify_update_product: async (input) =>
    runMockHandler("shopify_update_product", input),
  shopify_manage_inventory: async (input) =>
    runMockHandler("shopify_manage_inventory", input),
  shopify_manage_orders: async (input) =>
    runMockHandler("shopify_manage_orders", input),
};

function createToolDefinition(
  name: string,
  description: string,
): ToolDefinition<unknown, unknown> {
  const handler = handlers[name];

  if (!handler) {
    throw new Error(`No handler registered for tool: ${name}`);
  }

  return {
    name,
    description,
    handler,
  };
}

export const toolRegistry: ToolRegistry = {
  generate_product_listing: createToolDefinition(
    "generate_product_listing",
    "Generate a product listing draft with title, description, and tags.",
  ),
  research_market: createToolDefinition(
    "research_market",
    "Research market demand, pricing range, and trend opportunities.",
  ),
  research_competitors: createToolDefinition(
    "research_competitors",
    "Analyze competitors and positioning for a target product niche.",
  ),
  shopify_list_products: createToolDefinition(
    "shopify_list_products",
    "List products from the connected Shopify store.",
  ),
  shopify_create_product: createToolDefinition(
    "shopify_create_product",
    "Create a new Shopify product.",
  ),
  shopify_update_product: createToolDefinition(
    "shopify_update_product",
    "Update an existing Shopify product.",
  ),
  shopify_manage_inventory: createToolDefinition(
    "shopify_manage_inventory",
    "Read or update inventory levels for Shopify products.",
  ),
  shopify_manage_orders: createToolDefinition(
    "shopify_manage_orders",
    "List orders and retrieve order details from Shopify.",
  ),
};

export function getTool(name: string): ToolDefinition<unknown, unknown> | null {
  return toolRegistry[name] ?? null;
}
