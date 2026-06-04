import { NextResponse } from "next/server";
import { getChapterAudioSegmentPath, streamAudioSegmentWithRange } from "@/lib/chapter-audio-segments";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ chapterId: string; segmentIndex: string }> }) {
  const { chapterId, segmentIndex } = await params;
  const parsedIndex = Number(segmentIndex);
  if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
    return NextResponse.json({ error: "Invalid segment index" }, { status: 400 });
  }

  const audioPath = await getChapterAudioSegmentPath(chapterId, parsedIndex);
  if (!audioPath) {
    return NextResponse.json({ error: "Audio segment is not ready" }, { status: 404 });
  }

  try {
    return streamAudioSegmentWithRange(audioPath, request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Audio segment is missing on disk" }, { status: 404 });
  }
}
