import { listConversations } from "@/lib/db/conversation-store";

export async function GET(): Promise<Response> {
  const conversations = await listConversations();
  return Response.json({ conversations });
}
