const PRINTIFY_BASE_URL = "https://api.printify.com/v1";

function getPrintifyToken(): string {
  const token = process.env.PRINTIFY_API_TOKEN?.trim();
  if (!token) throw new Error("Missing PRINTIFY_API_TOKEN environment variable.");
  return token;
}

export async function printifyRequest<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getPrintifyToken();
  const url = `${PRINTIFY_BASE_URL}${path}`;

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Printify API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}
