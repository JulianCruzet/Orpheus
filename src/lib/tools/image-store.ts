// Server-side in-memory store for generated images.
// Allows tools to pass image data between each other without going through the LLM context.
// Uses globalThis to survive Next.js hot-module reloads in development.

type StoredImage = {
  base64Data: string;
  mimeType: string;
  createdAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __imageStore: Map<string, StoredImage> | undefined;
}

const store: Map<string, StoredImage> =
  globalThis.__imageStore ?? (globalThis.__imageStore = new Map());

const TTL_MS = 30 * 60 * 1000; // 30 minutes

function pruneExpired() {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (now - entry.createdAt > TTL_MS) store.delete(id);
  }
}

export function storeImage(base64Data: string, mimeType: string): string {
  pruneExpired();
  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  store.set(id, { base64Data, mimeType, createdAt: Date.now() });
  return id;
}

export function getImage(id: string): StoredImage | undefined {
  return store.get(id);
}
