export type ShopifyConfig = {
  storeDomain: string;
  accessToken: string;
  apiVersion: string;
};

export type ShopifyRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export interface ShopifyClient {
  request<TResponse = unknown>(
    path: string,
    options?: ShopifyRequestOptions,
  ): Promise<TResponse>;
}

function getShopifyConfig(): ShopifyConfig {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  const apiVersion = process.env.SHOPIFY_API_VERSION?.trim() || "2025-10";

  if (!storeDomain) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN environment variable.");
  }

  if (!accessToken) {
    throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN environment variable.");
  }

  return { storeDomain, accessToken, apiVersion };
}

function buildShopifyAdminUrl(
  storeDomain: string,
  path: string,
  apiVersion: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://${storeDomain}/admin/api/${apiVersion}${normalizedPath}`;
}

async function shopifyAdminRequest<TResponse = unknown>(
  config: ShopifyConfig,
  path: string,
  options: ShopifyRequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(
    buildShopifyAdminUrl(config.storeDomain, path, config.apiVersion),
    {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.accessToken,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Shopify request failed (${response.status}): ${errorText || "Unknown error"}`,
    );
  }

  return (await response.json()) as TResponse;
}

export function createShopifyClient(config: ShopifyConfig): ShopifyClient {
  return {
    request: <TResponse = unknown>(
      path: string,
      options?: ShopifyRequestOptions,
    ) => shopifyAdminRequest<TResponse>(config, path, options),
  };
}

export function createShopifyClientFromEnv(): ShopifyClient {
  return createShopifyClient(getShopifyConfig());
}
