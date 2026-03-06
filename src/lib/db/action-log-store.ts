import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { StructuredToolResult } from "@/lib/tools/types";

export type PersistedActionLog = {
  id: string;
  conversationId: string;
  toolName: string;
  status: "success" | "error" | "pending";
  input: unknown;
  output: unknown;
  errorCode: string | null;
  errorDetails: string | null;
  durationMs: number | null;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data", "action-log");

function nowIso(): string {
  return new Date().toISOString();
}

function getActionLogPath(conversationId: string): string {
  return path.join(DATA_DIR, `${conversationId}.json`);
}

async function readConversationActionLog(
  conversationId: string,
): Promise<PersistedActionLog[]> {
  try {
    const raw = await readFile(getActionLogPath(conversationId), "utf8");
    const parsed = JSON.parse(raw) as PersistedActionLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendToolExecutionLog(args: {
  conversationId: string;
  toolName: string;
  input: unknown;
  result: StructuredToolResult<unknown>;
}): Promise<PersistedActionLog> {
  await mkdir(DATA_DIR, { recursive: true });

  const existing = await readConversationActionLog(args.conversationId);

  const entry: PersistedActionLog = {
    id: randomUUID(),
    conversationId: args.conversationId,
    toolName: args.toolName,
    status: args.result.status,
    input: args.input,
    output: args.result.data ?? null,
    errorCode: args.result.error?.code ?? null,
    errorDetails: args.result.error?.details ?? null,
    durationMs: args.result.meta?.durationMs ?? null,
    createdAt: nowIso(),
  };

  const next = [...existing, entry];

  await writeFile(
    getActionLogPath(args.conversationId),
    JSON.stringify(next, null, 2),
    "utf8",
  );

  return entry;
}

export async function loadToolExecutionLog(
  conversationId: string,
): Promise<PersistedActionLog[]> {
  return readConversationActionLog(conversationId);
}
