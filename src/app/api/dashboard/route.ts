import { executeTool } from "@/lib/tools/registry";
import { NextResponse } from "next/server";
import type { ShopifyProductSummary } from "@/lib/tools/shopify-list-products";
import type { ShopifyOrderSummary } from "@/lib/tools/shopify-manage-orders";

export async function GET(): Promise<NextResponse> {
  try {
    const [productsResult, ordersResult] = await Promise.all([
      executeTool("shopify_list_products", { limit: 50 }),
      executeTool("shopify_manage_orders", { action: "list", limit: 20 }),
    ]);

    const rawProducts = (productsResult.data as ShopifyProductSummary[]) ?? [];
    const rawOrders = (ordersResult.data as ShopifyOrderSummary[]) ?? [];

    const revenue = rawOrders.reduce(
      (sum, o) => sum + parseFloat(o.totalPrice ?? "0"),
      0,
    );

    const performanceResult = await executeTool("analyze_store_performance", {
      revenueLast30d: revenue,
      ordersLast30d: rawOrders.length,
    });

    const products = rawProducts.map((p) => ({
      id: String(p.id),
      title: p.title,
      price: p.price ?? 0,
      inventory: p.inventory ?? 0,
      status: p.status,
    }));

    const orders = rawOrders.map((o) => ({
      id: o.name ?? String(o.id),
      total: parseFloat(o.totalPrice ?? "0"),
      financialStatus: o.financialStatus,
      fulfillmentStatus: o.fulfillmentStatus,
    }));

    return NextResponse.json({
      products: { products },
      orders: { orders },
      performance: performanceResult.data,
      status: "ok",
    });
  } catch (error) {
    console.error("[api/dashboard] failed:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data.", status: "error" },
      { status: 500 },
    );
  }
}
