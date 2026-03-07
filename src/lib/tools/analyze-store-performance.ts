import { ToolExecutionResult } from "@/lib/tools/types";

export interface AnalyzeStorePerformanceInput {
  revenueLast30d: number;
  ordersLast30d: number;
  adSpendLast30d?: number;
  sessionsLast30d?: number;
  refundsLast30d?: number;
}

export interface AnalyzeStorePerformanceOutput {
  snapshot: {
    revenueLast30d: number;
    ordersLast30d: number;
    averageOrderValue: number;
    conversionRate?: number;
    refundRate?: number;
    roas?: number;
  };
  insights: string[];
  recommendations: string[];
  healthScore: number;
}

function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toPercent(value: number): number {
  return Math.round(value * 10000) / 100;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function validateInput(
  input: AnalyzeStorePerformanceInput,
): ToolExecutionResult<null> | null {
  if (!input || typeof input !== "object") {
    return {
      status: "error",
      message: "invalid analytics payload.",
      error: {
        code: "INVALID_INPUT",
        details: "Input must be an object.",
      },
    };
  }

  if (typeof input.revenueLast30d !== "number" || input.revenueLast30d < 0) {
    return {
      status: "error",
      message: "revenueLast30d must be a non-negative number.",
      error: {
        code: "INVALID_REVENUE",
      },
    };
  }

  if (
    typeof input.ordersLast30d !== "number" ||
    !Number.isFinite(input.ordersLast30d) ||
    input.ordersLast30d < 0
  ) {
    return {
      status: "error",
      message: "ordersLast30d must be a non-negative number.",
      error: {
        code: "INVALID_ORDERS",
      },
    };
  }

  return null;
}

export async function analyzeStorePerformance(
  input: AnalyzeStorePerformanceInput,
): Promise<ToolExecutionResult<AnalyzeStorePerformanceOutput>> {
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  const orders = input.ordersLast30d;
  const revenue = input.revenueLast30d;
  const aov = orders > 0 ? revenue / orders : 0;

  const conversionRate =
    typeof input.sessionsLast30d === "number" && input.sessionsLast30d > 0
      ? orders / input.sessionsLast30d
      : undefined;

  const refundRate =
    typeof input.refundsLast30d === "number" && orders > 0
      ? input.refundsLast30d / orders
      : undefined;

  const roas =
    typeof input.adSpendLast30d === "number" && input.adSpendLast30d > 0
      ? revenue / input.adSpendLast30d
      : undefined;

  const insights: string[] = [];
  const recommendations: string[] = [];

  if (aov < 35) {
    insights.push("average order value is currently low for scaled paid growth.");
    recommendations.push("test bundles and post-purchase upsells to lift aov above $40.");
  } else {
    insights.push("average order value supports healthy margin expansion.");
  }

  if (conversionRate !== undefined) {
    if (conversionRate < 0.015) {
      insights.push("conversion rate is below common ecommerce baseline.");
      recommendations.push("improve product page proof: reviews, UGC, and clearer shipping/returns.");
    } else {
      insights.push("conversion rate is in a workable range.");
    }
  }

  if (refundRate !== undefined && refundRate > 0.08) {
    insights.push("refund rate is elevated and may be hurting repeatability.");
    recommendations.push("audit listing accuracy and add sizing/expectation clarity to reduce returns.");
  }

  if (roas !== undefined) {
    if (roas < 1.5) {
      insights.push("current ad efficiency is weak.");
      recommendations.push("pause worst-performing ad sets and reallocate budget to high-intent audiences.");
    } else {
      insights.push("ad efficiency is acceptable for current spend.");
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("maintain current strategy and run one controlled experiment this week.");
  }

  const scoreBase =
    55 +
    Math.min(20, aov / 3) +
    (conversionRate ? Math.min(15, conversionRate * 1000) : 0) +
    (roas ? Math.min(15, roas * 4) : 0) -
    (refundRate ? Math.min(20, refundRate * 100) : 0);

  return {
    status: "success",
    message: "store analytics snapshot generated.",
    data: {
      snapshot: {
        revenueLast30d: toMoney(revenue),
        ordersLast30d: orders,
        averageOrderValue: toMoney(aov),
        conversionRate:
          conversionRate !== undefined ? toPercent(conversionRate) : undefined,
        refundRate: refundRate !== undefined ? toPercent(refundRate) : undefined,
        roas: roas !== undefined ? toMoney(roas) : undefined,
      },
      insights,
      recommendations,
      healthScore: clampScore(scoreBase),
    },
  };
}
