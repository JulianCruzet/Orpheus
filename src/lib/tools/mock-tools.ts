import {
  SEEDED_INVENTORY,
  SEEDED_ORDERS,
  SEEDED_PRODUCTS,
} from "@/lib/demo/seed-store";
import { ToolExecutionResult } from "@/lib/tools/types";

type MockToolHandler = (input: unknown) => Promise<ToolExecutionResult<unknown>>;

const success = <TData>(message: string, data: TData): ToolExecutionResult<TData> => ({
  status: "success",
  message,
  data,
});

const mockHandlers: Record<string, MockToolHandler> = {
  shopify_list_products: async () =>
    success("mock mode: returned seeded product catalog.", {
      products: SEEDED_PRODUCTS,
      source: "mock",
    }),

  shopify_create_product: async (input) => {
    const payload = (input as Record<string, unknown>) ?? {};

    return success("mock mode: product creation simulated.", {
      id: `mock-prod-${Date.now()}`,
      title: payload.title ?? "Untitled Product",
      status: "active",
      source: "mock",
    });
  },

  shopify_update_product: async (input) => {
    const payload = (input as Record<string, unknown>) ?? {};

    return success("mock mode: product update simulated.", {
      productId: payload.productId ?? "mock-prod-1",
      updatedFields: payload,
      source: "mock",
    });
  },

  shopify_manage_inventory: async (input) => {
    const payload = (input as Record<string, unknown>) ?? {};
    const productId =
      typeof payload.productId === "string" ? payload.productId : "mock-prod-1";

    const seeded = SEEDED_INVENTORY.find((item) => item.productId === productId);

    return success("mock mode: inventory operation simulated.", {
      productId,
      quantity:
        typeof payload.quantity === "number"
          ? payload.quantity
          : (seeded?.available ?? 20),
      seededInventory: SEEDED_INVENTORY,
      source: "mock",
    });
  },

  shopify_manage_orders: async () =>
    success("mock mode: returned seeded orders.", {
      orders: SEEDED_ORDERS,
      source: "mock",
    }),

  generate_product_listing: async (input) => {
    const payload = (input as Record<string, unknown>) ?? {};
    const base = typeof payload.prompt === "string" ? payload.prompt : "product";

    return success("mock mode: generated listing copy.", {
      title: `${base} | Premium Edition`,
      description:
        "crafted for daily use with a premium feel, durable materials, and clean modern styling.",
      tags: ["premium", "trending", "giftable"],
      seoTitle: `${base} - premium quality for modern lifestyles`,
      seoDescription: "high-converting product copy generated in mock mode.",
      pricingSuggestion: {
        low: 29,
        target: 39,
        high: 49,
      },
      source: "mock",
    });
  },

  research_market: async (input) => {
    const payload = (input as Record<string, unknown>) ?? {};

    return success("mock mode: returned cached market analysis.", {
      query: payload.query ?? "general ecommerce niche",
      nicheSummary:
        "demand is growing for practical lifestyle products with strong social proof and creator-friendly branding.",
      competitorPricingRange: "$24 - $59",
      keywordTrendSummary:
        "keywords around 'minimal', 'durable', and 'travel-ready' show consistent weekly growth.",
      opportunityScore: 82,
      recommendation: "focus launch on UGC-friendly bundles and rapid A/B testing.",
      source: "mock",
    });
  },

  research_competitors: async (input) => {
    const payload = (input as Record<string, unknown>) ?? {};

    return success("mock mode: competitor snapshot generated.", {
      query: payload.query ?? "top competitors",
      competitors: [
        {
          name: "Northline Goods",
          positioning: "premium minimalism",
          avgPrice: 44,
        },
        {
          name: "Halo Cart",
          positioning: "value + fast shipping",
          avgPrice: 32,
        },
      ],
      insights: [
        "top competitors heavily use bundle discounts",
        "product pages with short-form video outperform static galleries",
      ],
      source: "mock",
    });
  },
};

export function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE === "true";
}

export async function executeMockTool(
  toolName: string,
  input: unknown,
): Promise<ToolExecutionResult<unknown> | null> {
  const handler = mockHandlers[toolName];

  if (!handler) {
    return null;
  }

  return handler(input);
}
