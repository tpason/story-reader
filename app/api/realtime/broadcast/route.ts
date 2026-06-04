import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReaderBroadcast = (event: Record<string, unknown>) => number;

function getBroadcaster() {
  return (globalThis as typeof globalThis & { __readerBroadcast?: ReaderBroadcast }).__readerBroadcast;
}

function isAuthorized(request: NextRequest) {
  const token = process.env.READER_REALTIME_TOKEN;
  if (!token && process.env.NODE_ENV !== "production") return true;
  if (!token) return false;

  const auth = request.headers.get("authorization");
  const headerToken = request.headers.get("x-reader-realtime-token");
  return auth === `Bearer ${token}` || headerToken === token;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized realtime broadcast" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const broadcaster = getBroadcaster();
  if (!broadcaster) {
    return NextResponse.json(
      { error: "WebSocket broadcaster is not available. Run npm run dev:ws or npm run start:ws." },
      { status: 503 }
    );
  }

  const event = {
    type: typeof body.type === "string" ? body.type : "notification_update",
    storyId: typeof body.storyId === "string" ? body.storyId : undefined,
    chapterNumber: typeof body.chapterNumber === "number" ? body.chapterNumber : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
    createdAt: new Date().toISOString()
  };

  const delivered = broadcaster(event);
  return NextResponse.json({ ok: true, delivered, event });
}
