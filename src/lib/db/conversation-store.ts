import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type PersistedChatRole = "user" | "assistant" | "tool";

export type PersistedChatMessage = {
  role: PersistedChatRole;
  content: string;
};

type ConversationRecord = {
  id: string;
  messages: PersistedChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "conversations");

function nowIso(): string {
  return new Date().toISOString();
}

function getConversationPath(conversationId: string): string {
  return path.join(DATA_DIR, `${conversationId}.json`);
}

export function createConversationId(): string {
  return randomUUID();
}

export type ConversationSummary = {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
};

// Conversation ids are UUIDs. Reject anything else so a request can't reach
// outside the data directory via path traversal.
export function isValidConversationId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

function deriveTitle(messages: PersistedChatMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  const raw = firstUser?.content?.trim() ?? "";

  if (!raw) {
    return "New conversation";
  }

  const oneLine = raw.replace(/\s+/g, " ");
  return oneLine.length > 48 ? `${oneLine.slice(0, 47).trimEnd()}…` : oneLine;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  let files: string[];

  try {
    files = await readdir(DATA_DIR);
  } catch {
    return [];
  }

  const summaries: ConversationSummary[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }

    try {
      const raw = await readFile(path.join(DATA_DIR, file), "utf8");
      const parsed = JSON.parse(raw) as ConversationRecord;
      const messages = Array.isArray(parsed.messages) ? parsed.messages : [];

      // Skip empty shells with no real user/assistant content.
      const hasContent = messages.some(
        (message) => message.role === "user" || message.role === "assistant",
      );
      if (!hasContent) {
        continue;
      }

      summaries.push({
        id: parsed.id ?? file.replace(/\.json$/, ""),
        title: deriveTitle(messages),
        messageCount: messages.length,
        updatedAt: parsed.updatedAt ?? parsed.createdAt ?? nowIso(),
        createdAt: parsed.createdAt ?? nowIso(),
      });
    } catch {
      // Skip unreadable or corrupt files.
    }
  }

  // Most recently updated first.
  summaries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return summaries;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    await unlink(getConversationPath(conversationId));
  } catch {
    // Already gone — treat as a successful delete.
  }
}

export async function loadConversationMessages(
  conversationId: string,
): Promise<PersistedChatMessage[]> {
  try {
    const raw = await readFile(getConversationPath(conversationId), "utf8");
    const parsed = JSON.parse(raw) as ConversationRecord;

    if (!Array.isArray(parsed.messages)) {
      return [];
    }

    return parsed.messages.filter(
      (message): message is PersistedChatMessage =>
        (message.role === "user" ||
          message.role === "assistant" ||
          message.role === "tool") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export async function saveConversationMessages(
  conversationId: string,
  messages: PersistedChatMessage[],
): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  // Preserve original createdAt if the conversation already exists
  let existingCreatedAt: string | null = null;
  try {
    const raw = await readFile(getConversationPath(conversationId), "utf8");
    const parsed = JSON.parse(raw) as ConversationRecord;
    existingCreatedAt = parsed.createdAt ?? null;
  } catch {
    // File doesn't exist yet — this is a new conversation
  }

  const record: ConversationRecord = {
    id: conversationId,
    messages,
    createdAt: existingCreatedAt ?? nowIso(),
    updatedAt: nowIso(),
  };

  await writeFile(
    getConversationPath(conversationId),
    JSON.stringify(record, null, 2),
    "utf8",
  );
}
