import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type SessionBody = {
  clientSessionId?: unknown;
  anonymousId?: unknown;
  storyId?: unknown;
  chapterId?: unknown;
  chapterNumber?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  durationSeconds?: unknown;
  startParagraphIndex?: unknown;
  endParagraphIndex?: unknown;
  startProgressPercent?: unknown;
  endProgressPercent?: unknown;
  deviceKind?: unknown;
};

function parseSessionBody(body: SessionBody) {
  const clientSessionId = typeof body.clientSessionId === "string" ? body.clientSessionId.slice(0, 120) : "";
  const anonymousId = typeof body.anonymousId === "string" ? body.anonymousId.trim().slice(0, 120) : "";
  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : null;
  const chapterNumber = Number(body.chapterNumber);
  const startedAt = typeof body.startedAt === "string" ? body.startedAt : new Date().toISOString();
  const endedAt = typeof body.endedAt === "string" ? body.endedAt : null;
  const durationSeconds = Math.max(0, Math.round(Number(body.durationSeconds) || 0));
  const startParagraphIndex = Math.max(0, Math.round(Number(body.startParagraphIndex) || 0));
  const endParagraphIndex = Math.max(0, Math.round(Number(body.endParagraphIndex) || 0));
  const startProgressPercent = Math.min(100, Math.max(0, Number(body.startProgressPercent) || 0));
  const endProgressPercent = Math.min(100, Math.max(0, Number(body.endProgressPercent) || 0));
  const deviceKind = body.deviceKind === "mobile" || body.deviceKind === "desktop" ? body.deviceKind : "unknown";

  return {
    clientSessionId,
    anonymousId,
    storyId,
    chapterId,
    chapterNumber,
    startedAt,
    endedAt,
    durationSeconds,
    startParagraphIndex,
    endParagraphIndex,
    startProgressPercent,
    endProgressPercent,
    deviceKind
  };
}

const SESSION_UPSERT_SET = `
  ended_at = EXCLUDED.ended_at,
  duration_seconds = GREATEST(reader_reading_sessions.duration_seconds, EXCLUDED.duration_seconds),
  end_paragraph_index = EXCLUDED.end_paragraph_index,
  end_progress_percent = EXCLUDED.end_progress_percent,
  updated_at = now()
`;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = parseSessionBody((await request.json().catch(() => ({}))) as SessionBody);

  if (!body.clientSessionId || !body.storyId || !Number.isInteger(body.chapterNumber) || body.chapterNumber < 1) {
    return NextResponse.json({ error: "Invalid reading session payload" }, { status: 400 });
  }

  if (user) {
    await query(
      `
        INSERT INTO reader_reading_sessions (
          user_id, anonymous_id, client_session_id, story_id, chapter_id, chapter_number,
          started_at, ended_at, duration_seconds,
          start_paragraph_index, end_paragraph_index,
          start_progress_percent, end_progress_percent,
          device_kind, created_at, updated_at
        )
        VALUES ($1, NULL, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8, $9, $10, $11, $12, $13, now(), now())
        ON CONFLICT (user_id, client_session_id) WHERE user_id IS NOT NULL
        DO UPDATE SET ${SESSION_UPSERT_SET}
      `,
      [
        user.id,
        body.clientSessionId,
        body.storyId,
        body.chapterId,
        body.chapterNumber,
        body.startedAt,
        body.endedAt,
        body.durationSeconds,
        body.startParagraphIndex,
        body.endParagraphIndex,
        body.startProgressPercent,
        body.endProgressPercent,
        body.deviceKind
      ]
    );
    return NextResponse.json({ ok: true, actor: "member" });
  }

  if (!body.anonymousId || body.anonymousId.length < 8) {
    return NextResponse.json({ error: "Missing anonymous reader id" }, { status: 400 });
  }

  await query(
    `
      INSERT INTO reader_reading_sessions (
        user_id, anonymous_id, client_session_id, story_id, chapter_id, chapter_number,
        started_at, ended_at, duration_seconds,
        start_paragraph_index, end_paragraph_index,
        start_progress_percent, end_progress_percent,
        device_kind, created_at, updated_at
      )
      VALUES (NULL, $1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8, $9, $10, $11, $12, $13, now(), now())
      ON CONFLICT (anonymous_id, client_session_id) WHERE user_id IS NULL AND anonymous_id IS NOT NULL
      DO UPDATE SET ${SESSION_UPSERT_SET}
    `,
    [
      body.anonymousId,
      body.clientSessionId,
      body.storyId,
      body.chapterId,
      body.chapterNumber,
      body.startedAt,
      body.endedAt,
      body.durationSeconds,
      body.startParagraphIndex,
      body.endParagraphIndex,
      body.startProgressPercent,
      body.endProgressPercent,
      body.deviceKind
    ]
  );

  return NextResponse.json({ ok: true, actor: "guest" });
}
