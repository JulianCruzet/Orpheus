import {
  createConversationId,
  loadConversationMessages,
  PersistedChatMessage,
  saveConversationMessages,
} from "@/lib/db/conversation-store";
import { appendToolExecutionLog } from "@/lib/db/action-log-store";
import { redactSensitiveData } from "@/lib/security/redact";
import { executeTool } from "@/lib/tools/registry";
import { StructuredToolResult } from "@/lib/tools/types";
import { geminiRespond, compactConversation, AgentStep } from "@/lib/ai/gemini-agent";
import { NextRequest } from "next/server";
import { z } from "zod";

const chatRoleSchema = z.enum(["system", "user", "assistant", "tool"]);

const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().trim().min(1),
});

const chatRequestBodySchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  messages: z.array(chatMessageSchema).min(1),
});

type ChatMessage = z.infer<typeof chatMessageSchema>;
type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;

const DESTRUCTIVE_TOOLS = new Set([
  "shopify_update_product",
  "shopify_manage_inventory",
]);

function buildActionSummary(
  toolName: string,
  input: Record<string, unknown>,
): string {
  switch (toolName) {
    case "shopify_list_products": {
      const limit =
        typeof input.limit === "number" && Number.isFinite(input.limit)
          ? input.limit
          : 10;
      return `about to fetch up to ${limit} products from your shopify catalog.`;
    }
    case "shopify_create_product":
      return "about to create a new shopify product using the generated listing details.";
    case "shopify_update_product":
      return "about to update an existing shopify product. this may change live storefront data.";
    case "shopify_manage_inventory":
      return "about to read or update inventory levels. this can affect live sellable stock.";
    case "shopify_manage_orders":
      return "about to fetch shopify order data for review.";
    case "generate_product_listing":
      return "about to generate AI product copy, tags, seo fields, and pricing suggestions.";
    case "research_market":
      return "about to run market research and summarize trends, pricing bands, and opportunities.";
    case "research_competitors":
      return "about to analyze competitor catalog and pricing/positioning patterns.";
    case "analyze_store_performance":
      return "about to analyze store performance metrics and generate insights.";
    case "generate_product_image":
      return "about to generate a product image from the given description.";
    case "shopify_discounts_collections":
      return "about to manage shopify discounts or collections.";
    case "draft_customer_response":
      return "about to draft a customer support response.";
    case "generate_marketing_copy":
      return "about to generate marketing copy (instagram, email, facebook ad, twitter).";
    default:
      return `about to execute ${toolName}.`;
  }
}

function toSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function requiresConfirmation(toolName: string, input: Record<string, unknown>): boolean {
  if (!DESTRUCTIVE_TOOLS.has(toolName)) {
    return false;
  }

  return input.confirmed !== true;
}

// Strip large binary fields before adding tool results to conversation history
// to avoid exceeding Gemini's token limit.
function stripBinaryData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(stripBinaryData);
  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === "base64Data" || key === "imageUrl" || key === "attachment") {
      result[key] = "[binary omitted]";
    } else {
      result[key] = stripBinaryData(val);
    }
  }
  return result;
}

// Truncate arrays to keep context lean — the model only needs a summary.
function truncateData(data: unknown): unknown {
  if (Array.isArray(data)) {
    const truncated = data.slice(0, 5).map(truncateData);
    if (data.length > 5) {
      truncated.push(`...and ${data.length - 5} more items`);
    }
    return truncated;
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = truncateData(val);
    }
    return result;
  }
  // Truncate long strings (e.g. verbose HTML descriptions)
  if (typeof data === "string" && data.length > 500) {
    return data.slice(0, 500) + "...[truncated]";
  }
  return data;
}

function asToolMessage(result: StructuredToolResult<unknown>): ChatMessage {
  // truncateData + stripBinaryData already keep the payload small.
  // Do NOT slice raw JSON — that breaks JSON.parse in buildContents and
  // causes Gemini to see "unknown_tool" responses, triggering infinite loops.
  const stripped = { ...result, data: truncateData(stripBinaryData(result.data)) };
  return {
    role: "tool",
    content: JSON.stringify(stripped),
  };
}

function toPersistedMessage(message: ChatMessage): PersistedChatMessage | null {
  if (message.role === "system") {
    return null;
  }

  return {
    role: message.role,
    content: message.content,
  };
}

function mergeMessages(
  existing: PersistedChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const fromStore: ChatMessage[] = existing.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (fromStore.length === 0) {
    return incoming;
  }

  if (incoming.length > fromStore.length) {
    const isPrefixMatch = fromStore.every((stored, index) => {
      const current = incoming[index];
      return (
        current &&
        current.role === stored.role &&
        current.content === stored.content
      );
    });

    if (isPrefixMatch) {
      return incoming;
    }
  }

  const lastIncoming = incoming[incoming.length - 1];

  if (!lastIncoming) {
    return fromStore;
  }

  const lastStored = fromStore[fromStore.length - 1];

  if (
    lastStored &&
    lastStored.role === lastIncoming.role &&
    lastStored.content === lastIncoming.content
  ) {
    return fromStore;
  }

  return [...fromStore, lastIncoming];
}

const WRITE_TOOLS = new Set([
  "shopify_create_product",
  "shopify_update_product",
  "shopify_manage_inventory",
  "shopify_discounts_collections",
]);

export async function POST(request: NextRequest): Promise<Response> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = chatRequestBodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return Response.json(
      {
        error:
          "Invalid request body. `messages` must be a non-empty array of { role, content }.",
      },
      { status: 400 },
    );
  }

  const body: ChatRequestBody = parsed.data;
  const conversationId = body.conversationId ?? createConversationId();
  const existingMessages = await loadConversationMessages(conversationId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            toSseEvent("start", {
              status: "streaming",
              conversationId,
              restoredMessages: existingMessages.length,
            }),
          ),
        );

        // The full system prompt lives in gemini-agent.ts (systemInstruction).
        // This marker is only kept so mergeMessages can identify system entries.
        const systemPrompt: ChatMessage = {
          role: "system",
          content: "shams-e ecommerce copilot",
        };

        const restoredConversation = mergeMessages(existingMessages, body.messages);

        const workingConversation: ChatMessage[] = [
          systemPrompt,
          ...restoredConversation,
        ];

        const completedWriteTools: string[] = [];
        const maxIterations = 8;
        let lastToolName: string | null = null;
        let repeatCount = 0;

        for (let iteration = 0; iteration < maxIterations; iteration += 1) {
          // Auto-compact conversation when it gets long to save tokens
          const compacted = await compactConversation(workingConversation) as ChatMessage[];
          if (compacted.length < workingConversation.length) {
            workingConversation.length = 0;
            workingConversation.push(...compacted);
          }

          const modelStep = await geminiRespond(workingConversation);

          // ── Handle tool calls (single or parallel) ──
          const toolCalls =
            modelStep.kind === "tool_call"
              ? [{ toolName: modelStep.toolName, input: modelStep.input, thought: modelStep.thought }]
              : modelStep.kind === "parallel_tool_calls"
                ? modelStep.calls
                : null;

          if (toolCalls) {
            // Loop detection — if the same single tool is called 2+ times in a row,
            // the model is stuck. Inject a nudge to break the loop.
            const primaryTool = toolCalls[0]?.toolName ?? null;
            if (toolCalls.length === 1 && primaryTool === lastToolName) {
              repeatCount += 1;
              if (repeatCount >= 2) {
                // Force the model to summarize what it already has
                workingConversation.push({
                  role: "user",
                  content:
                    "[system: you already called this tool — summarize the results you have so far for the user instead of calling it again.]",
                });
                lastToolName = null;
                repeatCount = 0;
                continue;
              }
            } else {
              lastToolName = primaryTool;
              repeatCount = 0;
            }
            // Emit thoughts & action summaries for every call
            for (const call of toolCalls) {
              controller.enqueue(
                encoder.encode(
                  toSseEvent("assistant_thought", { text: call.thought }),
                ),
              );
              controller.enqueue(
                encoder.encode(
                  toSseEvent("action_summary", {
                    toolName: call.toolName,
                    summary: buildActionSummary(call.toolName, call.input),
                    destructive: DESTRUCTIVE_TOOLS.has(call.toolName),
                  }),
                ),
              );
              controller.enqueue(
                encoder.encode(
                  toSseEvent("tool_call", {
                    toolName: call.toolName,
                    input: redactSensitiveData(call.input),
                  }),
                ),
              );
            }

            // Check if any call requires confirmation
            const needsConfirm = toolCalls.find((c) =>
              requiresConfirmation(c.toolName, c.input),
            );

            if (needsConfirm) {
              controller.enqueue(
                encoder.encode(
                  toSseEvent("confirmation_required", {
                    toolName: needsConfirm.toolName,
                    message:
                      "this action can modify live store data. resend with input.confirmed=true to proceed.",
                  }),
                ),
              );

              workingConversation.push({
                role: "assistant",
                content: `confirmation_required:${needsConfirm.toolName}`,
              });

              const messagesToPersist = workingConversation
                .map(toPersistedMessage)
                .filter((message): message is PersistedChatMessage =>
                  message !== null,
                );

              await saveConversationMessages(conversationId, messagesToPersist);

              controller.enqueue(
                encoder.encode(
                  toSseEvent("done", {
                    status: "requires_confirmation",
                    conversationId,
                    toolName: needsConfirm.toolName,
                  }),
                ),
              );
              controller.close();
              return;
            }

            // Execute all tool calls in parallel
            const results = await Promise.all(
              toolCalls.map(async (call) => {
                const toolResult = await executeTool(call.toolName, call.input);

                await appendToolExecutionLog({
                  conversationId,
                  toolName: call.toolName,
                  input: call.input,
                  result: toolResult,
                });

                if (WRITE_TOOLS.has(call.toolName)) {
                  completedWriteTools.push(call.toolName);
                }

                const redactedToolResult: StructuredToolResult<unknown> = {
                  ...toolResult,
                  data: redactSensitiveData(toolResult.data),
                  error: redactSensitiveData(toolResult.error),
                };

                controller.enqueue(
                  encoder.encode(
                    toSseEvent("tool_result", { result: redactedToolResult }),
                  ),
                );

                return { call, toolResult };
              }),
            );

            // Add all tool call/result pairs to conversation
            for (const { call, toolResult } of results) {
              workingConversation.push({
                role: "assistant",
                content: `tool_call:${call.toolName}:${JSON.stringify(call.input)}`,
              });
              workingConversation.push(asToolMessage(toolResult));
            }
            continue;
          }

          // At this point modelStep.kind must be "final"
          const finalStep = modelStep as { kind: "final"; response: string };

          // Stream tokens (minimal delay to keep UI responsive without wasting compute)
          const tokens = finalStep.response.split(" ");

          for (const token of tokens) {
            controller.enqueue(
              encoder.encode(toSseEvent("token", { text: `${token} ` })),
            );
          }

          workingConversation.push({
            role: "assistant",
            content: finalStep.response,
          });

          const messagesToPersist = workingConversation
            .map(toPersistedMessage)
            .filter((message): message is PersistedChatMessage =>
              message !== null,
            );

          await saveConversationMessages(conversationId, messagesToPersist);

          controller.enqueue(
            encoder.encode(
              toSseEvent("done", {
                status: "complete",
                conversationId,
                writtenTools: completedWriteTools,
              }),
            ),
          );
          controller.close();
          return;
        }

        const messagesToPersist = workingConversation
          .map(toPersistedMessage)
          .filter((message): message is PersistedChatMessage => message !== null);

        await saveConversationMessages(conversationId, messagesToPersist);

        controller.enqueue(
          encoder.encode(
            toSseEvent("done", {
              status: "complete",
              message: "max tool iterations reached",
              conversationId,
              writtenTools: completedWriteTools,
            }),
          ),
        );
        controller.close();
      } catch (error) {
        const details =
          error instanceof Error ? error.message : "Unexpected server error";

        controller.enqueue(
          encoder.encode(
            toSseEvent("error", {
              code: "CHAT_STREAM_FAILED",
              message:
                "something went wrong while generating your response. please try again.",
            }),
          ),
        );

        controller.enqueue(
          encoder.encode(
            toSseEvent("done", {
              status: "error",
              message:
                "unable to finish this request right now. please retry in a moment.",
              conversationId,
            }),
          ),
        );

        console.error("[api/chat] stream failed", { details, conversationId });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
