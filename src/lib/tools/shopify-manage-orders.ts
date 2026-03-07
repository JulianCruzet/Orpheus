import { createShopifyClientFromEnv, ShopifyClient } from "@/lib/shopify/client";
import { ToolExecutionResult } from "@/lib/tools/types";

type ShopifyOrderFinancialStatus =
  | "authorized"
  | "paid"
  | "partially_paid"
  | "pending"
  | "refunded"
  | "voided"
  | "unknown";

type ShopifyOrderFulfillmentStatus =
  | "fulfilled"
  | "partial"
  | "unfulfilled"
  | "restocked"
  | "unknown";

export interface ShopifyOrderSummary {
  id: number;
  name: string;
  email: string | null;
  createdAt: string;
  financialStatus: ShopifyOrderFinancialStatus;
  fulfillmentStatus: ShopifyOrderFulfillmentStatus;
  totalPrice: string;
  currency: string;
}

export interface ShopifyOrderDetail extends ShopifyOrderSummary {
  customerName: string | null;
  lineItems: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string | null;
  }>;
}

export interface ShopifyManageOrdersInput {
  action?: "list" | "detail";
  limit?: number;
  orderId?: number;
}

type ShopifyOrder = {
  id: number;
  name: string;
  email?: string | null;
  created_at: string;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  total_price?: string;
  currency?: string;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  line_items?: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    sku?: string | null;
  }>;
};

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface ShopifyOrderResponse {
  order: ShopifyOrder;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

function normalizeFinancialStatus(status: string | null | undefined): ShopifyOrderFinancialStatus {
  if (!status) {
    return "unknown";
  }

  if (
    status === "authorized" ||
    status === "paid" ||
    status === "partially_paid" ||
    status === "pending" ||
    status === "refunded" ||
    status === "voided"
  ) {
    return status;
  }

  return "unknown";
}

function normalizeFulfillmentStatus(
  status: string | null | undefined,
): ShopifyOrderFulfillmentStatus {
  if (!status) {
    return "unknown";
  }

  if (
    status === "fulfilled" ||
    status === "partial" ||
    status === "unfulfilled" ||
    status === "restocked"
  ) {
    return status;
  }

  return "unknown";
}

function toSummary(order: ShopifyOrder): ShopifyOrderSummary {
  return {
    id: order.id,
    name: order.name,
    email: order.email ?? null,
    createdAt: order.created_at,
    financialStatus: normalizeFinancialStatus(order.financial_status),
    fulfillmentStatus: normalizeFulfillmentStatus(order.fulfillment_status),
    totalPrice: order.total_price ?? "0.00",
    currency: order.currency ?? "USD",
  };
}

function toDetail(order: ShopifyOrder): ShopifyOrderDetail {
  const summary = toSummary(order);

  const firstName = order.customer?.first_name?.trim() ?? "";
  const lastName = order.customer?.last_name?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    ...summary,
    customerName: fullName.length > 0 ? fullName : null,
    lineItems: (order.line_items ?? []).map((lineItem) => ({
      id: lineItem.id,
      title: lineItem.title,
      quantity: lineItem.quantity,
      price: lineItem.price,
      sku: lineItem.sku ?? null,
    })),
  };
}

function parseListLimit(limit: number | undefined): number {
  const candidate = limit ?? DEFAULT_LIMIT;
  if (!Number.isFinite(candidate)) {
    return DEFAULT_LIMIT;
  }

  const normalized = Math.floor(candidate);
  if (normalized <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(normalized, MAX_LIMIT);
}

function validateInput(input: ShopifyManageOrdersInput): ToolExecutionResult<never> | null {
  const action = input.action ?? "list";

  if (action !== "list" && action !== "detail") {
    return {
      status: "error",
      message: "action must be either 'list' or 'detail'.",
      error: {
        code: "INVALID_ACTION",
      },
    };
  }

  if (action === "detail") {
    if (!Number.isFinite(input.orderId) || (input.orderId ?? 0) <= 0) {
      return {
        status: "error",
        message: "orderId is required for detail action.",
        error: {
          code: "INVALID_ORDER_ID",
        },
      };
    }
  }

  return null;
}

async function listOrders(
  client: ShopifyClient,
  limit: number,
): Promise<ShopifyOrderSummary[]> {
  const response = await client.request<ShopifyOrdersResponse>(
    `/orders.json?status=any&limit=${limit}`,
  );

  return response.orders.map(toSummary);
}

async function getOrderDetail(
  client: ShopifyClient,
  orderId: number,
): Promise<ShopifyOrderDetail> {
  const response = await client.request<ShopifyOrderResponse>(
    `/orders/${orderId}.json?status=any`,
  );

  return toDetail(response.order);
}

function mockOrders(limit: number): ShopifyOrderSummary[] {
  const items: ShopifyOrderSummary[] = [
    {
      id: 5001001,
      name: "#1001",
      email: "buyer.one@example.com",
      createdAt: new Date().toISOString(),
      financialStatus: "paid",
      fulfillmentStatus: "unfulfilled",
      totalPrice: "124.00",
      currency: "CAD",
    },
    {
      id: 5001002,
      name: "#1002",
      email: "buyer.two@example.com",
      createdAt: new Date().toISOString(),
      financialStatus: "pending",
      fulfillmentStatus: "unknown",
      totalPrice: "89.00",
      currency: "CAD",
    },
  ];

  return items.slice(0, limit);
}

function mockOrderDetail(orderId: number): ShopifyOrderDetail {
  return {
    id: orderId,
    name: `#${orderId}`,
    email: "buyer@example.com",
    createdAt: new Date().toISOString(),
    financialStatus: "paid",
    fulfillmentStatus: "unfulfilled",
    totalPrice: "124.00",
    currency: "CAD",
    customerName: "Alex Buyer",
    lineItems: [
      {
        id: 91001,
        title: "Midnight Noir Hoodie",
        quantity: 1,
        price: "79.00",
        sku: "MN-HOODIE-BLK-M",
      },
      {
        id: 91002,
        title: "Aurora Mesh Tee",
        quantity: 1,
        price: "45.00",
        sku: "AM-TEE-WHT-L",
      },
    ],
  };
}

export async function shopifyManageOrders(
  input: ShopifyManageOrdersInput = {},
): Promise<ToolExecutionResult<ShopifyOrderSummary[] | ShopifyOrderDetail>> {
  const validationError = validateInput(input);
  if (validationError) {
    return validationError;
  }

  const action = input.action ?? "list";

  if (isMockModeEnabled()) {
    if (action === "detail") {
      const detail = mockOrderDetail(input.orderId as number);

      return {
        status: "success",
        message: `returned mock details for order ${detail.name}.`,
        data: detail,
      };
    }

    const limit = parseListLimit(input.limit);
    const orders = mockOrders(limit);

    return {
      status: "success",
      message: `returned ${orders.length} mock order(s).`,
      data: orders,
    };
  }

  try {
    const client = createShopifyClientFromEnv();

    if (action === "detail") {
      const detail = await getOrderDetail(client, input.orderId as number);

      return {
        status: "success",
        message: `fetched details for order ${detail.name}.`,
        data: detail,
      };
    }

    const limit = parseListLimit(input.limit);
    const orders = await listOrders(client, limit);

    return {
      status: "success",
      message: `fetched ${orders.length} order(s) from shopify.`,
      data: orders,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";

    return {
      status: "error",
      message: "unable to manage orders right now.",
      error: {
        code: "SHOPIFY_MANAGE_ORDERS_FAILED",
        details,
      },
    };
  }
}
