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

type MockModelToolCall = {
  kind: "tool_call";
  toolName: string;
  input: Record<string, unknown>;
  assistantThought: string;
};

type MockModelFinal = {
  kind: "final";
  response: string;
};

type MockModelStep = MockModelToolCall | MockModelFinal;

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

function normalize(input: string): string {
  return input.toLowerCase().trim();
}

function chooseToolFromUserPrompt(
  prompt: string,
  priorToolCalls: string[],
): MockModelToolCall | null {
  const text = normalize(prompt);

  const hasCalled = (toolName: string): boolean =>
    priorToolCalls.includes(toolName);

  const isMarketingLaunchIntent =
    text.includes("launch") || text.includes("marketing") || text.includes("discount");

  if (isMarketingLaunchIntent) {
    if (!hasCalled("generate_product_listing")) {
      return {
        kind: "tool_call",
        toolName: "generate_product_listing",
        input: { prompt },
        assistantThought: "i'll generate launch-ready product copy first.",
      };
    }

    if (!hasCalled("shopify_discounts_collections")) {
      return {
        kind: "tool_call",
        toolName: "shopify_discounts_collections",
        input: {
          action: "create_discount",
          title: "launch-boost",
          percentageOff: 10,
          confirmed: true,
        },
        assistantThought: "now i'll create a launch discount to support the campaign.",
      };
    }

    return null;
  }

  const isZeroToStoreIntent =
    text.includes("zero") ||
    text.includes("from scratch") ||
    text.includes("create product") ||
    text.includes("new product") ||
    text.includes("start store");

  if (isZeroToStoreIntent) {
    if (!hasCalled("generate_product_listing")) {
      return {
        kind: "tool_call",
        toolName: "generate_product_listing",
        input: { prompt },
        assistantThought: "i'll generate the product copy package first.",
      };
    }

    if (!hasCalled("shopify_create_product")) {
      return {
        kind: "tool_call",
        toolName: "shopify_create_product",
        input: {
          title: "AI Launch Product",
          description: "created via shams-e zero-to-store flow",
          price: 49.99,
          tags: ["ai", "launch", "demo"],
          confirmed: true,
        },
        assistantThought: "great, now i'll publish that as a new shopify product.",
      };
    }

    return null;
  }

  const isMarketResearchIntent =
    text.includes("market") ||
    text.includes("trend") ||
    text.includes("research") ||
    text.includes("competitor");

  if (isMarketResearchIntent) {
    if (!hasCalled("research_market")) {
      return {
        kind: "tool_call",
        toolName: "research_market",
        input: { query: prompt },
        assistantThought: "i'll run market research first.",
      };
    }

    if (!hasCalled("research_competitors")) {
      return {
        kind: "tool_call",
        toolName: "research_competitors",
        input: { query: prompt },
        assistantThought: "next i'll analyze competitor pricing and positioning.",
      };
    }

    return null;
  }

  if (
    text.includes("list products") ||
    text.includes("show products") ||
    text.includes("products")
  ) {
    if (hasCalled("shopify_list_products")) {
      return null;
    }

    return {
      kind: "tool_call",
      toolName: "shopify_list_products",
      input: { limit: 10 },
      assistantThought: "i'll check your product catalog first.",
    };
  }

  return null;
}

function getPriorToolCalls(conversation: ChatMessage[]): string[] {
  return conversation
    .filter((message) => message.role === "assistant")
    .map((message) => {
      if (!message.content.startsWith("tool_call:")) {
        return null;
      }

      return message.content.slice("tool_call:".length);
    })
    .filter((toolName): toolName is string => Boolean(toolName));
}

function mockModelRespond(conversation: ChatMessage[]): MockModelStep {
  const lastUserMessage = [...conversation]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUserMessage) {
    return {
      kind: "final",
      response: "share what you want to do and i'll help.",
    };
  }

  const priorToolCalls = getPriorToolCalls(conversation);
  const toolCall = chooseToolFromUserPrompt(lastUserMessage.content, priorToolCalls);

  if (toolCall) {
    return toolCall;
  }

  return {
    kind: "final",
    response:
      "got it. i can help with products, market research, and competitors once you ask for one of those flows.",
  };
}

function asToolMessage(result: StructuredToolResult<unknown>): ChatMessage {
  return {
    role: "tool",
    content: JSON.stringify(result),
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

        const systemPrompt: ChatMessage = {
          role: "system",
          content:
            "you are shams-e, an ecommerce copilot. decide whether to call a tool or answer directly.",
        };

        const restoredConversation = mergeMessages(existingMessages, body.messages);

        const workingConversation: ChatMessage[] = [
          systemPrompt,
          ...restoredConversation,
        ];

        const maxIterations = 3;

        for (let iteration = 0; iteration < maxIterations; iteration += 1) {
          const modelStep = mockModelRespond(workingConversation);

          if (modelStep.kind === "tool_call") {
            controller.enqueue(
              encoder.encode(
                toSseEvent("assistant_thought", {
                  text: modelStep.assistantThought,
                }),
              ),
            );

            controller.enqueue(
              encoder.encode(
                toSseEvent("action_summary", {
                  toolName: modelStep.toolName,
                  summary: buildActionSummary(modelStep.toolName, modelStep.input),
                  destructive: DESTRUCTIVE_TOOLS.has(modelStep.toolName),
                }),
              ),
            );

            controller.enqueue(
              encoder.encode(
                toSseEvent("tool_call", {
                  toolName: modelStep.toolName,
                  input: redactSensitiveData(modelStep.input),
                }),
              ),
            );

            if (requiresConfirmation(modelStep.toolName, modelStep.input)) {
              controller.enqueue(
                encoder.encode(
                  toSseEvent("confirmation_required", {
                    toolName: modelStep.toolName,
                    message:
                      "this action can modify live store data. resend with input.confirmed=true to proceed.",
                  }),
                ),
              );

              workingConversation.push({
                role: "assistant",
                content: `confirmation_required:${modelStep.toolName}`,
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
                    toolName: modelStep.toolName,
                  }),
                ),
              );
              controller.close();
              return;
            }

            const toolResult = await executeTool(
              modelStep.toolName,
              modelStep.input,
            );

            await appendToolExecutionLog({
              conversationId,
              toolName: modelStep.toolName,
              input: modelStep.input,
              result: toolResult,
            });

            const redactedToolResult: StructuredToolResult<unknown> = {
              ...toolResult,
              data: redactSensitiveData(toolResult.data),
              error: redactSensitiveData(toolResult.error),
            };

            controller.enqueue(
              encoder.encode(
                toSseEvent("tool_result", {
                  result: redactedToolResult,
                }),
              ),
            );

            workingConversation.push({
              role: "assistant",
              content: `tool_call:${modelStep.toolName}`,
            });
            workingConversation.push(asToolMessage(toolResult));
            continue;
          }

          const tokens = modelStep.response.split(" ");

          for (const token of tokens) {
            controller.enqueue(
              encoder.encode(toSseEvent("token", { text: `${token} ` })),
            );
            await new Promise((resolve) => setTimeout(resolve, 20));
          }

          workingConversation.push({
            role: "assistant",
            content: modelStep.response,
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
