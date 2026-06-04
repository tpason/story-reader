import { extname } from "node:path";
import { NextResponse } from "next/server";
import { chapterHlsAssetPath, ensureChapterHls, streamFileResponse } from "@/lib/chapter-hls";
import { getChapterAudioPath } from "@/lib/stories";

export const dynamic = "force-dynamic";

const HLS_TYPES: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4",
  ".json": "application/json"
};

export async function GET(_request: Request, { params }: { params: Promise<{ chapterId: string; asset: string[] }> }) {
  const { chapterId, asset } = await params;
  const audioPath = await getChapterAudioPath(chapterId);

  if (!audioPath) {
    return NextResponse.json({ error: "No audio for this chapter" }, { status: 404 });
  }

  try {
    await ensureChapterHls(chapterId, audioPath);
    const absolutePath = chapterHlsAssetPath(chapterId, asset);
    const extension = extname(absolutePath).toLowerCase();
    return streamFileResponse(absolutePath, HLS_TYPES[extension] ?? "application/octet-stream", extension === ".m3u8" ? "private, max-age=30" : "private, max-age=86400");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "HLS audio is not available" }, { status: 404 });
  }
}
