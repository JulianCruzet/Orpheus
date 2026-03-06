import {
  StructuredToolResult,
  ToolExecutionResult,
} from "@/lib/tools/types";

export function toStructuredToolResult<TOutput = unknown>(
  toolName: string,
  result: ToolExecutionResult<TOutput>,
): StructuredToolResult<TOutput> {
  return {
    type: "tool_result",
    toolName,
    status: result.status,
    message: result.message,
    data: result.data,
    error: result.error,
    meta: result.meta,
  };
}
