import { NextResponse } from "next/server";
import { getCachedStory } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const revalidate = 120;

export async function GET(_: Request, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId: storyKey } = await params;
    const storyId = storyKeyToId(storyKey);
    if (!isStoryUuid(storyId)) {
      return NextResponse.json({ error: "Invalid story id" }, { status: 404 });
    }

    const story = await getCachedStory(storyId);
    return NextResponse.json(story, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load story", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
