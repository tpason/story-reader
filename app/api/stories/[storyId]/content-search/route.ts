import { NextRequest, NextResponse } from "next/server";
import { searchStoryChapterContent } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId: storyKey } = await params;
  const storyId = storyKeyToId(storyKey);
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!isStoryUuid(storyId)) {
    return NextResponse.json({ error: "Invalid story id" }, { status: 404 });
  }

  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await searchStoryChapterContent(storyId, query, {
      limit: Number(request.nextUrl.searchParams.get("limit") ?? 20)
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to search story content", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
