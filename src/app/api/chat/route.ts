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
import { geminiRespond } from "@/lib/ai/gemini-agent";
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

function asToolMessage(result: StructuredToolResult<unknown>): ChatMessage {
  const stripped = { ...result, data: stripBinaryData(result.data) };
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

        const systemPrompt: ChatMessage = {
          role: "system",
          content: [
            "you are shams-e, an ecommerce copilot. be action-first: when you have enough information to call a tool, call it immediately — do not re-explain or ask for confirmation unless the action is destructive.",
            "follow-through rule: if you asked the user a question and they answered it, call the relevant tool immediately. never ignore a direct answer to your own question.",
            "product lookup rule: shopify_update_product and shopify_manage_inventory require a numeric productId. if the user refers to a product by name (e.g. 'the mug', 'sunset tee'), first call shopify_list_products to find its ID, then immediately call the update/inventory tool with that ID. do not ask the user for the ID.",
            "upload to shopify rule: when the user says 'upload to shopify', 'add to shopify', or 'put it on shopify' — they want shopify_create_product called with the product details you already know. if you need a price, ask once then act immediately on their answer.",
            "tool selection rules:",
            "- generate_product_image: logos and artwork only.",
            "- printify_generate_mockups: physical products (t-shirt, mug, hoodie, etc.). chain after generate_product_image if artwork is needed.",
            "- shopify_create_product: create a new shopify listing. always pass status='active'. description generation rule: ALWAYS call generate_product_listing first to get a professional title, description, and tags — even if the user gave a description. pass the generate_product_listing output as descriptionHtml and tags into shopify_create_product.",
            "- shopify_update_product: change price, title, description, or tags. requires productId — look it up first if not known.",
            "- shopify_manage_inventory: read or update stock levels.",
            "- generate_marketing_copy: captions, email campaigns, ads, promotional content.",
            "keep responses concise and lowercase. never show a generic help menu unless the user explicitly asks what you can do.",
          ].join(" "),
        };

        const restoredConversation = mergeMessages(existingMessages, body.messages);

        const workingConversation: ChatMessage[] = [
          systemPrompt,
          ...restoredConversation,
        ];

        const completedWriteTools: string[] = [];
        const maxIterations = 5;

        for (let iteration = 0; iteration < maxIterations; iteration += 1) {
          const modelStep = await geminiRespond(workingConversation);

          if (modelStep.kind === "tool_call") {
            controller.enqueue(
              encoder.encode(
                toSseEvent("assistant_thought", {
                  text: modelStep.thought,
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

            if (WRITE_TOOLS.has(modelStep.toolName)) {
              completedWriteTools.push(modelStep.toolName);
            }

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

          // Stream tokens
          const tokens = modelStep.response.split(" ");

          for (const token of tokens) {
            controller.enqueue(
              encoder.encode(toSseEvent("token", { text: `${token} ` })),
            );
            await new Promise((resolve) => setTimeout(resolve, 15));
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
