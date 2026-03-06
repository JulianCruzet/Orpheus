const SHOPIFY_API_VERSION = "2025-01";

export interface ShopifyClientConfig {
  storeDomain: string;
  adminAccessToken: string;
  apiVersion?: string;
}

export interface ShopifyRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export class ShopifyClient {
  private readonly storeDomain: string;
  private readonly adminAccessToken: string;
  private readonly apiVersion: string;

  constructor(config: ShopifyClientConfig) {
    this.storeDomain = config.storeDomain;
    this.adminAccessToken = config.adminAccessToken;
    this.apiVersion = config.apiVersion ?? SHOPIFY_API_VERSION;
  }

  public async request<TResponse = unknown>(
    path: string,
    options: ShopifyRequestOptions = {},
  ): Promise<TResponse> {
    const basePath = path.startsWith("/") ? path : `/${path}`;
    const url = `https://${this.storeDomain}/admin/api/${this.apiVersion}${basePath}`;

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.adminAccessToken,
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Shopify request failed (${response.status} ${response.statusText}): ${details}`,
      );
    }

    return (await response.json()) as TResponse;
  }
}

export function createShopifyClientFromEnv(): ShopifyClient {
  const storeDomain =
    process.env.SHOPIFY_STORE_DOMAIN ?? process.env.SHOPIFY_STORE_URL;
  const adminAccessToken =
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? process.env.SHOPIFY_ACCESS_TOKEN;

  if (!storeDomain) {
    throw new Error(
      "Missing SHOPIFY_STORE_DOMAIN (or SHOPIFY_STORE_URL) environment variable.",
    );
  }

  if (!adminAccessToken) {
    throw new Error(
      "Missing SHOPIFY_ADMIN_ACCESS_TOKEN (or SHOPIFY_ACCESS_TOKEN) environment variable.",
    );
  }

  return new ShopifyClient({
    storeDomain,
    adminAccessToken,
    apiVersion: process.env.SHOPIFY_API_VERSION,
  });
}
