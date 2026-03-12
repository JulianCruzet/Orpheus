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
  price: number;
  inventory: number;
  imageUrl: string | null;
}

interface ShopifyProductsResponse {
  products: Array<{
    id: number;
    title: string;
    status?: string;
    vendor?: string;
    handle?: string;
    variants?: Array<{
      price?: string;
      inventory_quantity?: number;
    }>;
    image?: { src?: string } | null;
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
      vendor: "Orpheus",
      handle: "midnight-noir-hoodie",
      price: 79.00,
      inventory: 24,
      imageUrl: null,
    },
    {
      id: 1002,
      title: "Solar Drift Cargo Pants",
      status: "draft",
      vendor: "Orpheus",
      handle: "solar-drift-cargo-pants",
      price: 95.00,
      inventory: 12,
      imageUrl: null,
    },
    {
      id: 1003,
      title: "Aurora Mesh Tee",
      status: "active",
      vendor: "Orpheus",
      handle: "aurora-mesh-tee",
      price: 45.00,
      inventory: 38,
      imageUrl: null,
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
    price: parseFloat(product.variants?.[0]?.price ?? "0"),
    inventory: product.variants?.[0]?.inventory_quantity ?? 0,
    imageUrl: product.image?.src ?? null,
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
