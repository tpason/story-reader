import { NextResponse } from "next/server";
import { getStory } from "@/lib/stories";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ storyId: string }> }) {
  try {
    const { storyId: storyKey } = await params;
    const storyId = storyKeyToId(storyKey);
    if (!isStoryUuid(storyId)) {
      return NextResponse.json({ error: "Invalid story id" }, { status: 404 });
    }

    const story = await getStory(storyId);
    return NextResponse.json(story);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load story", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
