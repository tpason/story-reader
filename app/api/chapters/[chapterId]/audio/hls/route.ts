import { NextResponse } from "next/server";
import { getChapterHlsStatus, warmChapterHls } from "@/lib/chapter-hls";
import { getChapterAudioPath } from "@/lib/stories";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const audioPath = await getChapterAudioPath(chapterId);

  if (!audioPath) {
    return NextResponse.json({ ready: false, processing: false, playlistUrl: null, error: "No audio for this chapter" }, { status: 404 });
  }

  return NextResponse.json(getChapterHlsStatus(chapterId, audioPath));
}

export async function POST(_request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  const audioPath = await getChapterAudioPath(chapterId);

  if (!audioPath) {
    return NextResponse.json({ ready: false, processing: false, playlistUrl: null, error: "No audio for this chapter" }, { status: 404 });
  }

  return NextResponse.json(warmChapterHls(chapterId, audioPath), { status: 202 });
}
