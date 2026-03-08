import { executeTool } from "@/lib/tools/registry";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  try {
    const [productsResult, ordersResult, performanceResult] = await Promise.all([
      executeTool("shopify_list_products", { limit: 50 }),
      executeTool("shopify_manage_orders", { action: "list", limit: 20 }),
      executeTool("analyze_store_performance", {}),
    ]);

    return NextResponse.json({
      products: productsResult.data,
      orders: ordersResult.data,
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
