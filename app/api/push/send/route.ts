import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

type SubRow = { endpoint: string; p256dh: string; auth: string };

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
    storySlug?: unknown;
  };

  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  if (!storyId) return NextResponse.json({ error: "storyId required" }, { status: 400 });

  const storyTitle = typeof body.storyTitle === "string" ? body.storyTitle : "Truyện mới cập nhật";
  const chapterNumber = Number(body.chapterNumber) || 0;
  const chapterTitle = typeof body.chapterTitle === "string" ? body.chapterTitle : null;
  const storySlug = typeof body.storySlug === "string" ? body.storySlug : null;
  const url = storySlug
    ? `/stories/${storyId}/${storySlug}/chapters/${chapterNumber}`
    : `/stories/${storyId}`;

  const subs = await query<SubRow>(
    `
      SELECT ps.endpoint, ps.p256dh, ps.auth
      FROM reader_push_subscriptions ps
      JOIN reader_follows rf ON rf.user_id = ps.user_id
      WHERE rf.story_id = $1
    `,
    [storyId]
  );

  if (subs.length === 0) return NextResponse.json({ sent: 0, expired: 0 });

  const payload = {
    title: storyTitle,
    body: chapterTitle
      ? `Chương ${chapterNumber}: ${chapterTitle}`
      : `Chương ${chapterNumber} mới`,
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    storyId,
    chapterNumber,
    url,
  };

  const results = await Promise.allSettled(
    subs.map((sub) => sendPush(sub.endpoint, sub, payload))
  );

  const expired: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      const code = (result.reason as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) expired.push(subs[i].endpoint);
    }
  });

  if (expired.length > 0) {
    await query(
      `DELETE FROM reader_push_subscriptions WHERE endpoint = ANY($1)`,
      [expired]
    );
  }

  return NextResponse.json({ sent: subs.length, expired: expired.length });
}
