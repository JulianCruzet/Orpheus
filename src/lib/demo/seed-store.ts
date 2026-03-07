export type SeedProduct = {
  id: string;
  title: string;
  price: number;
  inventory: number;
  status: "active" | "draft";
};

export type SeedOrder = {
  id: string;
  total: number;
  financialStatus: "paid" | "pending" | "refunded";
  fulfillmentStatus: "fulfilled" | "unfulfilled" | "partial";
  lineItems: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export const SEEDED_PRODUCTS: SeedProduct[] = [
  {
    id: "mock-prod-1",
    title: "ZenFlow Desk Lamp",
    price: 49.99,
    inventory: 18,
    status: "active",
  },
  {
    id: "mock-prod-2",
    title: "Aether Travel Mug",
    price: 27.0,
    inventory: 42,
    status: "active",
  },
  {
    id: "mock-prod-3",
    title: "PulseGrip Phone Stand",
    price: 19.5,
    inventory: 9,
    status: "draft",
  },
];

export const SEEDED_INVENTORY = SEEDED_PRODUCTS.map((product) => ({
  productId: product.id,
  available: product.inventory,
  sku: `${product.id.toUpperCase()}-SKU`,
}));

export const SEEDED_ORDERS: SeedOrder[] = [
  {
    id: "mock-order-101",
    total: 89.99,
    financialStatus: "paid",
    fulfillmentStatus: "unfulfilled",
    lineItems: [
      { productId: "mock-prod-1", quantity: 1, unitPrice: 49.99 },
      { productId: "mock-prod-2", quantity: 1, unitPrice: 40.0 },
    ],
  },
  {
    id: "mock-order-102",
    total: 54,
    financialStatus: "paid",
    fulfillmentStatus: "fulfilled",
    lineItems: [{ productId: "mock-prod-2", quantity: 2, unitPrice: 27.0 }],
  },
];
