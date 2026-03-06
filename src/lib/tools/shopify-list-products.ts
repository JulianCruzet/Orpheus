import { createShopifyClientFromEnv, ShopifyClient } from "@/lib/shopify/client";
import { ToolExecutionResult } from "@/lib/tools/types";

export interface ShopifyListProductsInput {
  limit?: number;
}

export interface ShopifyProductSummary {
  id: number;
  title: string;
  status: string;
  vendor: string;
  handle: string;
}

interface ShopifyProductsResponse {
  products: Array<{
    id: number;
    title: string;
    status?: string;
    vendor?: string;
    handle?: string;
  }>;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parseLimit(input: ShopifyListProductsInput): number {
  const candidate = input.limit ?? DEFAULT_LIMIT;
  if (!Number.isFinite(candidate)) {
    return DEFAULT_LIMIT;
  }

  const normalized = Math.floor(candidate);

  if (normalized <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(normalized, MAX_LIMIT);
}

function mockProducts(limit: number): ShopifyProductSummary[] {
  const items: ShopifyProductSummary[] = [
    {
      id: 1001,
      title: "Midnight Noir Hoodie",
      status: "active",
      vendor: "Shams-E",
      handle: "midnight-noir-hoodie",
    },
    {
      id: 1002,
      title: "Solar Drift Cargo Pants",
      status: "draft",
      vendor: "Shams-E",
      handle: "solar-drift-cargo-pants",
    },
    {
      id: 1003,
      title: "Aurora Mesh Tee",
      status: "active",
      vendor: "Shams-E",
      handle: "aurora-mesh-tee",
    },
  ];

  return items.slice(0, limit);
}

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

async function fetchProducts(
  client: ShopifyClient,
  limit: number,
): Promise<ShopifyProductSummary[]> {
  const response = await client.request<ShopifyProductsResponse>(
    `/products.json?limit=${limit}`,
  );

  return response.products.map((product) => ({
    id: product.id,
    title: product.title,
    status: product.status ?? "unknown",
    vendor: product.vendor ?? "unknown",
    handle: product.handle ?? "",
  }));
}

export async function shopifyListProducts(
  input: ShopifyListProductsInput = {},
): Promise<ToolExecutionResult<ShopifyProductSummary[]>> {
  const limit = parseLimit(input);

  if (isMockModeEnabled()) {
    const products = mockProducts(limit);

    return {
      status: "success",
      message: `returned ${products.length} mock product(s).`,
      data: products,
    };
  }

  try {
    const client = createShopifyClientFromEnv();
    const products = await fetchProducts(client, limit);

    return {
      status: "success",
      message: `fetched ${products.length} product(s) from shopify.`,
      data: products,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "error",
      message: "unable to list products right now.",
      error: {
        code: "SHOPIFY_LIST_PRODUCTS_FAILED",
        details,
      },
    };
  }
}
