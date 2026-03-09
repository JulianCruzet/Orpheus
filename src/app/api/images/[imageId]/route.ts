import { getImage } from "@/lib/tools/image-store";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;
  const stored = getImage(imageId);

  if (!stored) {
    return new Response("Not found", { status: 404 });
  }

  const binary = Buffer.from(stored.base64Data, "base64");

  return new Response(binary, {
    headers: {
      "Content-Type": stored.mimeType,
      "Cache-Control": "private, max-age=1800",
    },
  });
}
