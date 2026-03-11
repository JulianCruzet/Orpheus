import { mkdir, readFile, writeFile } from "node:fs/promises";
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
