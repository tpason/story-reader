import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReaderPayload } from "@/lib/stories";
import type { ContentLayer } from "@/lib/reader-content-layers";
import type { BilingualDisplayMode } from "@/lib/reader-bilingual-prefs";
import type { ReaderFetchOptions } from "@/lib/types";
import { isStoryUuid, storyKeyToId } from "@/lib/urls";

export const dynamic = "force-dynamic";

function parseLayer(value: string | null): ContentLayer | undefined {
  if (value === "raw" || value === "translated" || value === "polished") return value;
  return undefined;
}

function parseDisplayMode(value: string | null): BilingualDisplayMode | undefined {
  if (value === "single" || value === "interleaved" || value === "secondary_hidden") return value;
  return undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storyId: string; chapterNumber: string }> }
) {
  const { storyId: storyKey, chapterNumber } = await params;
  const storyId = storyKeyToId(storyKey);
  const parsedChapter = Number(chapterNumber);
  const url = new URL(request.url);
  const options: ReaderFetchOptions = {
    primaryLayer: parseLayer(url.searchParams.get("primary")),
    secondaryLayer: parseLayer(url.searchParams.get("secondary")) ?? null,
    displayMode: parseDisplayMode(url.searchParams.get("mode"))
  };

  if (!isStoryUuid(storyId) || !Number.isInteger(parsedChapter) || parsedChapter < 1) {
    return NextResponse.json({ error: "Invalid story id or chapter number" }, { status: 404 });
  }

  try {
    const user = await getCurrentUser();
    const data = await getReaderPayload(storyId, parsedChapter, {
      ...options,
      viewerUserId: user?.id
    });
    const isDefault =
      !options.primaryLayer &&
      !options.secondaryLayer &&
      (!options.displayMode || options.displayMode === "single");
    const isUgc = data.story.sourceCode === "self_publish";
    return NextResponse.json(data, {
      headers: {
        "Cache-Control":
          isUgc || user || !isDefault
            ? "private, no-store"
            : "public, s-maxage=120, stale-while-revalidate=600"
      }
    });
  } catch (error) {
    const digest = error && typeof error === "object" && "digest" in error ? String((error as { digest?: unknown }).digest) : "";
    if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to load chapter", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
