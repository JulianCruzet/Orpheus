export type ToolResultStatus = "success" | "error" | "pending";

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  schema?: Record<string, unknown>;
  handler: (input: TInput) => Promise<ToolExecutionResult<TOutput>>;
}

export interface ToolExecutionResult<TOutput = unknown> {
  status: ToolResultStatus;
  message?: string;
  data?: TOutput;
  error?: {
    code: string;
    details?: string;
  };
  meta?: {
    durationMs?: number;
    startedAt?: string;
    finishedAt?: string;
  };
}

export type ToolRegistry = Record<string, ToolDefinition<any, any>>;

export interface StructuredToolResult<TOutput = unknown> {
  type: "tool_result";
  toolName: string;
  status: ToolResultStatus;
  message?: string;
  data?: TOutput;
  error?: {
    code: string;
    details?: string;
  };
  meta?: {
    durationMs?: number;
    startedAt?: string;
    finishedAt?: string;
  };
}
