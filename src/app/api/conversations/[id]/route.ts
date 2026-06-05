import {
  deleteConversation,
  isValidConversationId,
  loadConversationMessages,
} from "@/lib/db/conversation-store";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  if (!isValidConversationId(id)) {
    return Response.json({ error: "Invalid conversation id." }, { status: 400 });
  }

  const messages = await loadConversationMessages(id);
  return Response.json({ id, messages });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  if (!isValidConversationId(id)) {
    return Response.json({ error: "Invalid conversation id." }, { status: 400 });
  }

  await deleteConversation(id);
  return Response.json({ ok: true });
}
