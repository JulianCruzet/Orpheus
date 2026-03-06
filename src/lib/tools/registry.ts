import {
  ToolDefinition,
  ToolExecutionResult,
  ToolRegistry,
} from "@/lib/tools/types";

const notImplemented = async (
  toolName: string,
): Promise<ToolExecutionResult<null>> => {
  return {
    status: "error",
    message: `${toolName} is not implemented yet.`,
    error: {
      code: "NOT_IMPLEMENTED",
      details: "Tool handler scaffold exists but business logic is pending.",
    },
  };
};

export const toolRegistry: ToolRegistry = {
  shopify_list_products: {
    name: "shopify_list_products",
    description: "List products from the connected Shopify store.",
    handler: async () => notImplemented("shopify_list_products"),
  },
  shopify_create_product: {
    name: "shopify_create_product",
    description: "Create a new Shopify product.",
    handler: async () => notImplemented("shopify_create_product"),
  },
  shopify_update_product: {
    name: "shopify_update_product",
    description: "Update an existing Shopify product.",
    handler: async () => notImplemented("shopify_update_product"),
  },
  shopify_manage_inventory: {
    name: "shopify_manage_inventory",
    description: "Read or update Shopify inventory counts.",
    handler: async () => notImplemented("shopify_manage_inventory"),
  },
  shopify_manage_orders: {
    name: "shopify_manage_orders",
    description: "List or fetch Shopify order details.",
    handler: async () => notImplemented("shopify_manage_orders"),
  },
  generate_product_listing: {
    name: "generate_product_listing",
    description: "Generate product listing content with AI.",
    handler: async () => notImplemented("generate_product_listing"),
  },
  research_market: {
    name: "research_market",
    description: "Research market trends and pricing opportunities.",
    handler: async () => notImplemented("research_market"),
  },
  research_competitors: {
    name: "research_competitors",
    description: "Analyze competitor products and positioning.",
    handler: async () => notImplemented("research_competitors"),
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
