import { NextResponse } from "next/server";
import { streamAudioSegmentWithRange } from "@/lib/chapter-audio-segments";
import { getChapterAudioPath } from "@/lib/stories";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const audioPath = await getChapterAudioPath(chapterId);

  if (!audioPath) {
    return NextResponse.json({ error: "No audio for this chapter" }, { status: 404 });
  }

  try {
    return streamAudioSegmentWithRange(audioPath, request);
  } catch {
    return NextResponse.json({ error: "Audio file is missing on disk" }, { status: 404 });
  }
}
