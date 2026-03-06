import { NextRequest } from "next/server";
import { z } from "zod";

const chatRoleSchema = z.enum(["system", "user", "assistant"]);

const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().trim().min(1),
});

const chatRequestBodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
});

type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;

function toSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
          "Invalid request body. `messages` must be a non-empty array of { role: system|user|assistant, content: non-empty string }.",
      },
      { status: 400 },
    );
  }

  const body: ChatRequestBody = parsed.data;

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
