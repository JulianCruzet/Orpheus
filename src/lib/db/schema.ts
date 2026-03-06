export type ConversationRow = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageRow = {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
};

export type ActionLogRow = {
  id: string;
  conversationId: string | null;
  messageId: string | null;
  toolName: string;
  status: "success" | "error" | "pending";
  inputJson: string | null;
  outputJson: string | null;
  errorCode: string | null;
  errorDetails: string | null;
  durationMs: number | null;
  createdAt: string;
};

export const conversationsTableSql = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

export const messagesTableSql = `
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
`;

export const actionLogTableSql = `
CREATE TABLE IF NOT EXISTS action_log (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  message_id TEXT,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT,
  output_json TEXT,
  error_code TEXT,
  error_details TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
);
`;

export function getTableBootstrapSql(): string[] {
  return [conversationsTableSql, messagesTableSql, actionLogTableSql];
}
