import {
  createConversationId,
  loadConversationMessages,
  PersistedChatMessage,
  saveConversationMessages,
} from "@/lib/db/conversation-store";
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

function toSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function normalize(input: string): string {
  return input.toLowerCase().trim();
}

function chooseToolFromUserPrompt(prompt: string): MockModelToolCall | null {
  const text = normalize(prompt);

  if (
    text.includes("list products") ||
    text.includes("show products") ||
    text.includes("products")
  ) {
    return {
      kind: "tool_call",
      toolName: "shopify_list_products",
      input: { limit: 10 },
      assistantThought: "i'll check your product catalog first.",
    };
  }

  if (text.includes("market") || text.includes("trend")) {
    return {
      kind: "tool_call",
      toolName: "research_market",
      input: { query: prompt },
      assistantThought: "i'll run market research for that request.",
    };
  }

  if (text.includes("competitor")) {
    return {
      kind: "tool_call",
      toolName: "research_competitors",
      input: { query: prompt },
      assistantThought: "i'll analyze competitors first.",
    };
  }

  return null;
}

function mockModelRespond(conversation: ChatMessage[]): MockModelStep {
  const lastMessage = conversation[conversation.length - 1];

  if (lastMessage?.role === "tool") {
    return {
      kind: "final",
      response:
        "i used the requested tool and captured the result. once real handlers are wired, this response will include live business output.",
    };
  }

  const lastUserMessage = [...conversation]
    .reverse()
    .find((message) => message.role === "user");

  if (!lastUserMessage) {
    return {
      kind: "final",
      response: "share what you want to do and i'll help.",
    };
  }

  const toolCall = chooseToolFromUserPrompt(lastUserMessage.content);

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
                toSseEvent("tool_call", {
                  toolName: modelStep.toolName,
                  input: modelStep.input,
                }),
              ),
            );

            const toolResult = await executeTool(
              modelStep.toolName,
              modelStep.input,
            );

            controller.enqueue(
              encoder.encode(
                toSseEvent("tool_result", {
                  toolName: toolResult.toolName,
                  status: toolResult.status,
                  message: toolResult.message,
                  error: toolResult.error,
                  meta: toolResult.meta,
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
