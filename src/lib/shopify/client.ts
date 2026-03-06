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

type ShopifyRequestError = Error & {
  status?: number;
  retryAfterSeconds?: number;
};

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function createFriendlyError(
  status: number,
  rawErrorText: string,
  retryAfterSeconds?: number,
): ShopifyRequestError {
  const baseError = new Error() as ShopifyRequestError;
  baseError.status = status;
  baseError.retryAfterSeconds = retryAfterSeconds;

  if (status === 401 || status === 403) {
    baseError.message =
      "Shopify authentication failed. Check SHOPIFY_ADMIN_ACCESS_TOKEN permissions and store domain.";
    return baseError;
  }

  if (status === 429) {
    baseError.message = retryAfterSeconds
      ? `Shopify rate limit reached. Retry after ${retryAfterSeconds} seconds.`
      : "Shopify rate limit reached. Please retry shortly.";
    return baseError;
  }

  if (status >= 500) {
    baseError.message =
      "Shopify is temporarily unavailable. Please retry in a moment.";
    return baseError;
  }

  baseError.message = `Shopify request failed (${status}): ${rawErrorText || "Unknown error"}`;
  return baseError;
}

function shouldRetry(error: ShopifyRequestError, attempt: number): boolean {
  if (attempt >= DEFAULT_MAX_RETRIES) {
    return false;
  }

  if (typeof error.status !== "number") {
    return true;
  }

  return error.status === 429 || error.status >= 500;
}

function getRetryDelayMs(
  error: ShopifyRequestError,
  attempt: number,
): number {
  if (error.status === 429 && error.retryAfterSeconds) {
    return error.retryAfterSeconds * 1000;
  }

  return DEFAULT_RETRY_DELAY_MS * 2 ** attempt;
}

async function shopifyAdminRequest<TResponse = unknown>(
  config: ShopifyConfig,
  path: string,
  options: ShopifyRequestOptions = {},
): Promise<TResponse> {
  let attempt = 0;

  while (true) {
    try {
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
        throw createFriendlyError(
          response.status,
          errorText,
          parseRetryAfterSeconds(response.headers.get("Retry-After")),
        );
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      const requestError =
        error instanceof Error ? (error as ShopifyRequestError) : new Error("Unknown Shopify request failure.");

      if (!shouldRetry(requestError, attempt)) {
        throw requestError;
      }

      const delayMs = getRetryDelayMs(requestError, attempt);
      await sleep(delayMs);
      attempt += 1;
    }
  }
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
