import { NextRequest, NextResponse } from "next/server";
import { listChaptersCursor, searchChapters } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ storyId: string }> }) {
  const { storyId: storyKey } = await params;
  const storyId = storyKeyToId(storyKey);
  const searchParams = request.nextUrl.searchParams;

  if (!isStoryUuid(storyId)) {
    return NextResponse.json({ error: "Invalid story id" }, { status: 404 });
  }

  try {
    const search = searchParams.get("q")?.trim();
    if (search) {
      const data = await searchChapters(storyId, search, {
        limit: Number(searchParams.get("limit") ?? searchParams.get("pageSize") ?? 60)
      });
      return NextResponse.json(data);
    }

    const data = await listChaptersCursor(storyId, {
      cursor: searchParams.get("cursor"),
      limit: Number(searchParams.get("limit") ?? searchParams.get("pageSize") ?? 60),
      chapterNumber: Number(searchParams.get("chapterNumber") ?? NaN),
      direction: searchParams.get("direction") === "previous" ? "previous" : "next"
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load chapters", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
