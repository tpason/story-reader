import { NextResponse } from "next/server";
import { getReaderPayload } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ storyId: string; chapterNumber: string }> }
) {
  const { storyId: storyKey, chapterNumber } = await params;
  const storyId = storyKeyToId(storyKey);
  const parsedChapter = Number(chapterNumber);

  if (!isStoryUuid(storyId) || !Number.isInteger(parsedChapter) || parsedChapter < 1) {
    return NextResponse.json({ error: "Invalid story id or chapter number" }, { status: 404 });
  }

  try {
    const data = await getReaderPayload(storyId, parsedChapter);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load chapter", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
