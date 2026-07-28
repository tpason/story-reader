import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

    const user = await getCurrentUser();
    const story = await getStory(storyId, { viewerUserId: user?.id });
    const isUgc = story.sourceCode === "self_publish";
    return NextResponse.json(story, {
      headers: {
        "Cache-Control":
          isUgc || user ? "private, no-store" : "public, s-maxage=120, stale-while-revalidate=600"
      }
    });
  } catch (error) {
    const digest = error && typeof error === "object" && "digest" in error ? String((error as { digest?: unknown }).digest) : "";
    if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to load story", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
