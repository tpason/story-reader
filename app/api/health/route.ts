import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReaderBroadcast = (event: Record<string, unknown>) => number;

function getBroadcaster() {
  return (globalThis as typeof globalThis & { __readerBroadcast?: ReaderBroadcast }).__readerBroadcast;
}

export async function GET() {
  const broadcaster = getBroadcaster();
  return NextResponse.json({
    ok: true,
    websocket: Boolean(broadcaster),
    timestamp: new Date().toISOString()
  });
}
