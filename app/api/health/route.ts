import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReaderBroadcast = (event: Record<string, unknown>) => number;
type ReaderBroadcastMeta = () => { clients: number; dev: boolean };

function getBroadcaster() {
  return (globalThis as typeof globalThis & { __readerBroadcast?: ReaderBroadcast }).__readerBroadcast;
}

function getBroadcastMeta() {
  return (globalThis as typeof globalThis & { __readerBroadcastMeta?: ReaderBroadcastMeta }).__readerBroadcastMeta;
}

export async function GET() {
  const broadcaster = getBroadcaster();
  const meta = getBroadcastMeta()?.();
  return NextResponse.json({
    ok: true,
    websocket: Boolean(broadcaster),
    wsClients: meta?.clients ?? 0,
    nodeEnv: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString()
  });
}
