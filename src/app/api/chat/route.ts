import { NextRequest } from "next/server";

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatRequestBody = {
  messages: ChatMessage[];
};

function isValidMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const maybeMessage = message as Partial<ChatMessage>;

  return (
    (maybeMessage.role === "system" ||
      maybeMessage.role === "user" ||
      maybeMessage.role === "assistant") &&
    typeof maybeMessage.content === "string" &&
    maybeMessage.content.trim().length > 0
  );
}

function toSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return Response.json(
      { error: "`messages` must be a non-empty array." },
      { status: 400 },
    );
  }

  if (!body.messages.every(isValidMessage)) {
    return Response.json(
      {
        error:
          "Each message must include a valid role (system|user|assistant) and non-empty content.",
      },
      { status: 400 },
    );
  }

  const lastUserMessage = [...body.messages]
    .reverse()
    .find((message) => message.role === "user");

  const assistantReply = lastUserMessage
    ? `got it. here's a streamed response for: "${lastUserMessage.content}"`
    : "got it. how can i help?";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const words = assistantReply.split(" ");

      controller.enqueue(
        encoder.encode(toSseEvent("start", { status: "streaming" })),
      );

      for (const word of words) {
        controller.enqueue(
          encoder.encode(toSseEvent("token", { text: `${word} ` })),
        );
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      controller.enqueue(
        encoder.encode(toSseEvent("done", { status: "complete" })),
      );
      controller.close();
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
