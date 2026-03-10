"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type DashboardData = {
  products?: {
    products?: Array<{
      id: string;
      title: string;
      price: number;
      inventory: number;
      status: string;
    }>;
  };
  orders?: {
    orders?: Array<{
      id: string;
      total: number;
      financialStatus: string;
      fulfillmentStatus: string;
    }>;
  };
  performance?: {
    snapshot?: {
      revenueLast30d: number;
      ordersLast30d: number;
      averageOrderValue: number;
      conversionRate: number;
      refundRate: number;
    };
    healthScore?: number;
    insights?: string[];
    recommendations?: string[];
  };
};

function getHealthColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-rose-400";
}

function getHealthBg(score: number): string {
  if (score >= 80) return "bg-emerald-400/10 border-emerald-400/20";
  if (score >= 60) return "bg-amber-400/10 border-amber-400/20";
  return "bg-rose-400/10 border-rose-400/20";
}

function getStatusBadge(status: string): { bg: string; text: string } {
  switch (status) {
    case "paid":
    case "fulfilled":
    case "active":
      return { bg: "bg-emerald-400/15", text: "text-emerald-300" };
    case "pending":
    case "unfulfilled":
    case "draft":
      return { bg: "bg-amber-400/15", text: "text-amber-300" };
    case "refunded":
      return { bg: "bg-rose-400/15", text: "text-rose-300" };
    default:
      return { bg: "bg-white/10", text: "text-white/60" };
  }
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const cardBase =
  "rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.035]";

export function DashboardPanel({
  dashboardVersion,
}: {
  dashboardVersion: number;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dashboardVersion]);

  const products = data?.products?.products ?? [];
  const orders = data?.orders?.orders ?? [];
  const snapshot = data?.performance?.snapshot;
  const healthScore = data?.performance?.healthScore ?? 0;
  const insights = data?.performance?.insights ?? [];
  const recommendations = data?.performance?.recommendations ?? [];
  const lowStockProducts = products.filter((p) => p.inventory < 15);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-[#5EEAD4]/30 border-t-[#5EEAD4] animate-spin" />
          <span className="text-sm text-white/40">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-full overflow-y-auto p-6"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h2
            className="text-2xl tracking-[-0.02em] text-[#e8e4de]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dashboard
          </h2>
          <p className="mt-1 text-[13px] text-white/30">
            Store overview and performance metrics
          </p>
        </div>

        {/* Top row: Health + Revenue + Conversion */}
        <div className="mb-4 grid grid-cols-3 gap-4">
          {/* Health Score */}
          <div className={`${cardBase} flex flex-col items-center justify-center border ${getHealthBg(healthScore)}`}>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Store Health
            </p>
            <p className={`mt-2 text-5xl font-medium tracking-tight ${getHealthColor(healthScore)}`}>
              {healthScore}
            </p>
            <p className="mt-1 text-[11px] text-white/25">out of 100</p>
          </div>

          {/* Revenue */}
          <div className={cardBase}>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Revenue (30d)
            </p>
            <p className="mt-3 text-3xl font-medium tracking-tight text-[#e8e4de]">
              {snapshot ? formatCurrency(snapshot.revenueLast30d) : "--"}
            </p>
            <div className="mt-3 flex gap-4 text-[12px] text-white/35">
              <span>{snapshot?.ordersLast30d ?? 0} orders</span>
              <span>AOV {snapshot ? formatCurrency(snapshot.averageOrderValue) : "--"}</span>
            </div>
          </div>

          {/* Conversion */}
          <div className={cardBase}>
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Conversion Rate
            </p>
            <p className="mt-3 text-3xl font-medium tracking-tight text-[#e8e4de]">
              {snapshot?.conversionRate ?? 0}%
            </p>
            <div className="mt-3 flex gap-4 text-[12px] text-white/35">
              <span>Refund rate: {snapshot?.refundRate ?? 0}%</span>
            </div>
          </div>
        </div>

        {/* Products table */}
        <div className={`${cardBase} mb-4`}>
          <div className="mb-4 flex items-center justify-between">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Products ({products.length})
            </p>
          </div>
          {products.length === 0 ? (
            <p className="text-[13px] text-white/25">No products yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] font-medium uppercase tracking-[0.1em] text-white/25">
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Price</th>
                    <th className="pb-2 pr-4">Inventory</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const badge = getStatusBadge(p.status);
                    return (
                      <tr key={p.id} className="border-b border-white/[0.03]">
                        <td className="py-2.5 pr-4 text-white/70">{p.title}</td>
                        <td className="py-2.5 pr-4 text-white/50">{formatCurrency(p.price)}</td>
                        <td className={`py-2.5 pr-4 ${p.inventory < 15 ? "text-amber-400" : "text-white/50"}`}>
                          {p.inventory}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom row: Orders + Low Stock + Insights */}
        <div className="grid grid-cols-3 gap-4">
          {/* Recent Orders */}
          <div className={cardBase}>
            <p
              className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Recent Orders
            </p>
            {orders.length === 0 ? (
              <p className="text-[13px] text-white/25">No orders yet.</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 5).map((o) => {
                  const badge = getStatusBadge(o.financialStatus);
                  return (
                    <div key={o.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                      <div>
                        <p className="text-[12px] text-white/60">{o.id}</p>
                        <p className="text-[11px] text-white/30">{o.fulfillmentStatus}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-medium text-white/70">{formatCurrency(o.total)}</p>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-medium ${badge.bg} ${badge.text}`}>
                          {o.financialStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Low Stock */}
          <div className={cardBase}>
            <p
              className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Inventory Alerts
            </p>
            {lowStockProducts.length === 0 ? (
              <p className="text-[13px] text-emerald-300/60">All stock levels healthy.</p>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-amber-400/10 bg-amber-400/[0.04] px-3 py-2">
                    <span className="text-[12px] text-amber-200/80">{p.title}</span>
                    <span className="text-[12px] font-medium text-amber-400">{p.inventory} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className={cardBase}>
            <p
              className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              AI Insights
            </p>
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={`i-${i}`} className="flex gap-2 text-[12px]">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5EEAD4]/50" />
                  <span className="text-white/50">{insight}</span>
                </div>
              ))}
              {recommendations.map((rec, i) => (
                <div key={`r-${i}`} className="flex gap-2 text-[12px]">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/50" />
                  <span className="text-white/50">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
