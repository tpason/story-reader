import { NextResponse } from "next/server";
import { listRecentComments } from "@/lib/recent-comments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = Number(searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(raw) ? raw : 10;

  try {
    const items = await listRecentComments(limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[comments/recent]", error);
    return NextResponse.json({ error: "Không tải được luận đạo gần đây." }, { status: 500 });
  }
}
