import {
  SEEDED_INVENTORY,
  SEEDED_ORDERS,
  SEEDED_PRODUCTS,
} from "@/lib/demo/seed-store";
import { ToolExecutionResult } from "@/lib/tools/types";
import {
  buildMockPricingOutput,
  SuggestPricingInput,
} from "@/lib/tools/suggest-pricing";

type MockToolHandler = (input: unknown) => Promise<ToolExecutionResult<unknown>>;

const success = <TData>(message: string, data: TData): ToolExecutionResult<TData> => ({
  status: "success",
  message,
  data,
});

const mockHandlers: Record<string, MockToolHandler> = {
  shopify_list_products: async () =>
    success("mock mode: returned seeded product catalog.", SEEDED_PRODUCTS),

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
    success("mock mode: returned seeded orders.", SEEDED_ORDERS),

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

  generate_product_image: async (input) => {
    const payload = (input as Record<string, unknown>) ?? {};
    const prompt =
      typeof payload.prompt === "string" && payload.prompt.trim().length > 0
        ? payload.prompt.trim()
        : "premium product on clean studio backdrop";

    return success("mock mode: generated product image preview URL.", {
      imageUrl: `https://picsum.photos/seed/${Date.now()}/1024/1024`,
      prompt,
      style: payload.style ?? "studio",
      aspectRatio: payload.aspectRatio ?? "1:1",
      source: "mock",
    });
  },

  analyze_store_performance: async (input) => {
    const payload = (input as Record<string, unknown>) ?? {};
    const revenue =
      typeof payload.revenueLast30d === "number" ? payload.revenueLast30d : 8420;
    const orders =
      typeof payload.ordersLast30d === "number" ? payload.ordersLast30d : 214;
    const aov = orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0;

    return success("mock mode: returned analytics insight snapshot.", {
      snapshot: {
        revenueLast30d: revenue,
        ordersLast30d: orders,
        averageOrderValue: aov,
        conversionRate: 2.14,
        refundRate: 3.2,
        roas: 2.7,
      },
      insights: [
        "conversion is healthy for a cold-traffic heavy funnel",
        "aov can grow with bundle-first merchandising",
      ],
      recommendations: [
        "launch a two-tier bundle test and compare 7-day AOV lift",
        "reuse best creative hooks from top ROAS ad set in PDP media",
      ],
      healthScore: 81,
      source: "mock",
    });
  },

  suggest_pricing: async (input) => {
    const payload = (input ?? {}) as SuggestPricingInput;
    const productName =
      typeof payload.productName === "string" && payload.productName.trim().length > 0
        ? payload.productName.trim()
        : "your product";

    // Share the tool's pricing logic so mock and live paths stay in sync.
    const output = buildMockPricingOutput(payload);

    return success(
      `mock mode: pricing recommendation generated for "${productName}".`,
      { ...output, source: "mock" },
    );
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
