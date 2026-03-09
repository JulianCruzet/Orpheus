import { createShopifyClientFromEnv, ShopifyClient } from "@/lib/shopify/client";
import { ToolExecutionResult } from "@/lib/tools/types";

export interface ShopifyManageInventoryInput {
  action?: "read" | "update";
  inventoryItemId?: number;
  productId?: number;   // alternative to inventoryItemId — tool will resolve automatically
  locationId?: number;  // optional — auto-fetched from store if omitted
  available?: number;
}

export interface ShopifyInventoryLevel {
  inventoryItemId: number;
  locationId: number;
  available: number;
  updatedAt?: string;
}

interface ShopifyInventoryLevelsResponse {
  inventory_levels: Array<{
    inventory_item_id: number;
    location_id: number;
    available: number;
    updated_at?: string;
  }>;
}

interface ShopifyLocationsResponse {
  locations: Array<{ id: number; name: string; active: boolean }>;
}

interface ShopifyProductVariantsResponse {
  product: { variants: Array<{ id: number; inventory_item_id: number; title: string; inventory_management: string | null }> };
}

interface ShopifyInventoryLevelSetResponse {
  inventory_level: {
    inventory_item_id: number;
    location_id: number;
    available: number;
    updated_at?: string;
  };
}

function isMockModeEnabled(): boolean {
  return process.env.MOCK_MODE?.toLowerCase() === "true";
}

function parseAction(input: ShopifyManageInventoryInput): "read" | "update" {
  return input.action === "update" ? "update" : "read";
}

function toInventoryLevel(
  level: ShopifyInventoryLevelsResponse["inventory_levels"][number],
): ShopifyInventoryLevel {
  return {
    inventoryItemId: level.inventory_item_id,
    locationId: level.location_id,
    available: level.available,
    updatedAt: level.updated_at,
  };
}

function validateRequiredNumber(
  value: number | undefined,
  fieldName: string,
): string | null {
  if (value === undefined) {
    return `missing required field: ${fieldName}`;
  }

  if (!Number.isFinite(value)) {
    return `${fieldName} must be a finite number`;
  }

  if (Math.floor(value) !== value) {
    return `${fieldName} must be an integer`;
  }

  if (value < 0) {
    return `${fieldName} must be non-negative`;
  }

  return null;
}

function mockReadResult(input: ShopifyManageInventoryInput): ShopifyInventoryLevel[] {
  const itemId = input.inventoryItemId ?? 1001;
  const locationId = input.locationId ?? 2001;

  return [
    {
      inventoryItemId: itemId,
      locationId,
      available: 24,
      updatedAt: new Date().toISOString(),
    },
  ];
}

function mockUpdateResult(
  input: ShopifyManageInventoryInput,
): ShopifyInventoryLevel {
  return {
    inventoryItemId: input.inventoryItemId ?? 1001,
    locationId: input.locationId ?? 2001,
    available: input.available ?? 0,
    updatedAt: new Date().toISOString(),
  };
}

async function getFirstLocationId(client: ShopifyClient): Promise<number> {
  const response = await client.request<ShopifyLocationsResponse>("/locations.json");
  const active = response.locations.find((l) => l.active) ?? response.locations[0];
  if (!active) throw new Error("No locations found in Shopify store.");
  return active.id;
}

async function getInventoryItemIdFromProduct(
  client: ShopifyClient,
  productId: number,
): Promise<number> {
  const response = await client.request<ShopifyProductVariantsResponse>(
    `/products/${productId}.json?fields=variants`,
  );
  const first = response.product.variants[0];
  if (!first) throw new Error(`No variants found for product ${productId}.`);

  // Enable inventory tracking if not already set
  if (first.inventory_management !== "shopify") {
    await client.request(`/variants/${first.id}.json`, {
      method: "PUT",
      body: { variant: { id: first.id, inventory_management: "shopify" } },
    });
  }

  return first.inventory_item_id;
}

async function readInventoryLevel(
  client: ShopifyClient,
  inventoryItemId: number,
  locationId: number,
): Promise<ShopifyInventoryLevel | null> {
  const response = await client.request<ShopifyInventoryLevelsResponse>(
    `/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${locationId}`,
  );

  const [firstLevel] = response.inventory_levels;
  if (!firstLevel) {
    return null;
  }

  return toInventoryLevel(firstLevel);
}

async function updateInventoryLevel(
  client: ShopifyClient,
  inventoryItemId: number,
  locationId: number,
  available: number,
): Promise<ShopifyInventoryLevel> {
  const response = await client.request<ShopifyInventoryLevelSetResponse>(
    "/inventory_levels/set.json",
    {
      method: "POST",
      body: {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available,
      },
    },
  );

  return {
    inventoryItemId: response.inventory_level.inventory_item_id,
    locationId: response.inventory_level.location_id,
    available: response.inventory_level.available,
    updatedAt: response.inventory_level.updated_at,
  };
}

export async function shopifyManageInventory(
  input: ShopifyManageInventoryInput = {},
): Promise<ToolExecutionResult<ShopifyInventoryLevel | ShopifyInventoryLevel[]>> {
  const action = parseAction(input);

  if (!input.inventoryItemId && !input.productId) {
    return {
      status: "error",
      message: "provide either inventoryItemId or productId.",
      error: { code: "INVALID_INVENTORY_INPUT", details: "inventoryItemId or productId is required." },
    };
  }

  if (action === "update") {
    const availableError = validateRequiredNumber(input.available, "available");
    if (availableError) {
      return {
        status: "error",
        message: availableError,
        error: { code: "INVALID_INVENTORY_INPUT", details: availableError },
      };
    }
  }

  if (isMockModeEnabled()) {
    if (action === "update") {
      return { status: "success", message: "updated mock inventory level.", data: mockUpdateResult(input) };
    }
    const levels = mockReadResult(input);
    return { status: "success", message: `returned ${levels.length} mock inventory level(s).`, data: levels };
  }

  try {
    const client = createShopifyClientFromEnv();

    // Resolve inventory item ID from product if needed
    const inventoryItemId = input.inventoryItemId
      ?? await getInventoryItemIdFromProduct(client, input.productId as number);

    // Auto-fetch location ID if not provided
    const locationId = input.locationId ?? await getFirstLocationId(client);

    if (action === "update") {
      const updated = await updateInventoryLevel(client, inventoryItemId, locationId, input.available as number);
      return { status: "success", message: "updated shopify inventory level.", data: updated };
    }

    const level = await readInventoryLevel(client, inventoryItemId, locationId);

    if (!level) {
      return {
        status: "error",
        message: "inventory level not found for the provided item/location.",
        error: { code: "INVENTORY_LEVEL_NOT_FOUND" },
      };
    }

    return { status: "success", message: "fetched shopify inventory level.", data: level };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      message: "unable to manage inventory right now.",
      error: { code: "SHOPIFY_MANAGE_INVENTORY_FAILED", details },
    };
  }
}
