import { NextResponse } from "next/server";
import { checkAudioSegmentStartGate, getChapterAudioSegmentStatus, prepareChapterAudioSegments } from "@/lib/chapter-audio-segments";

export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  try {
    const url = new URL(request.url);
    const waitMs = Math.min(15000, Math.max(0, Number(url.searchParams.get("waitMs") ?? 0)));
    const afterReadyCount = Number(url.searchParams.get("afterReadyCount"));
    const startedAt = Date.now();
    let status = await getChapterAudioSegmentStatus(chapterId);

    while (
      waitMs > 0 &&
      Number.isFinite(afterReadyCount) &&
      status.processing &&
      status.readyCount <= afterReadyCount &&
      Date.now() - startedAt < waitMs
    ) {
      await sleep(350);
      status = await getChapterAudioSegmentStatus(chapterId);
    }

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to get audio segment status" }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  try {
    const currentStatus = await getChapterAudioSegmentStatus(chapterId);
    if (currentStatus.processing || currentStatus.firstReadySegmentUrl || currentStatus.complete) {
      return NextResponse.json(currentStatus, { status: 202 });
    }

    const gate = await checkAudioSegmentStartGate(chapterId);
    if (!gate.canStart) {
      return NextResponse.json(
        {
          ...currentStatus,
          busy: true,
          gate
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(gate.retryAfterSeconds)
          }
        }
      );
    }

    return NextResponse.json({ ...(await prepareChapterAudioSegments(chapterId)), gate }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start audio segment generation" }, { status: 400 });
  }
}
