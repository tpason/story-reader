import { NextResponse } from "next/server";
import { sendChapterPushToReaders } from "@/lib/push-notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.PUSH_SEND_SECRET ?? "";
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    storyId?: unknown;
    storyTitle?: unknown;
    chapterNumber?: unknown;
    chapterTitle?: unknown;
  };

  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  if (!storyId) return NextResponse.json({ error: "storyId required" }, { status: 400 });

  const result = await sendChapterPushToReaders({
    storyId,
    chapterNumber: Number(body.chapterNumber) || 0,
    storyTitle: typeof body.storyTitle === "string" ? body.storyTitle : null,
    chapterTitle: typeof body.chapterTitle === "string" ? body.chapterTitle : null
  });

  return NextResponse.json(result);
}
