import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type BookmarkRow = {
  id: string;
  story_id: string;
  story_title: string;
  cover_image_url: string | null;
  chapter_id: string | null;
  chapter_number: number;
  chapter_title: string | null;
  scroll_position: number;
  progress_percent: string;
  note: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapBookmark(row: BookmarkRow) {
  return {
    id: row.id,
    storyId: row.story_id,
    storyTitle: row.story_title,
    coverImageUrl: row.cover_image_url,
    chapterId: row.chapter_id,
    chapterNumber: row.chapter_number,
    chapterTitle: row.chapter_title,
    scrollPosition: row.scroll_position,
    progressPercent: Number(row.progress_percent),
    note: row.note,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });

  const rows = await query<BookmarkRow>(
    `
      SELECT
        b.id, b.story_id, COALESCE(NULLIF(s.display_title, ''), s.title) AS story_title,
        s.cover_image_url, b.chapter_id, b.chapter_number, b.chapter_title,
        b.scroll_position, b.progress_percent::text AS progress_percent,
        b.note, b.created_at, b.updated_at
      FROM reader_bookmarks b
      JOIN stories s ON s.id = b.story_id
      WHERE b.user_id = $1
      ORDER BY b.updated_at DESC
      LIMIT 200
    `,
    [user.id]
  );

  return NextResponse.json({ items: rows.map(mapBookmark) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần nhập môn để sync bookmark vào database" }, { status: 401 });

  const body = (await request.json()) as {
    storyId?: unknown;
    chapterId?: unknown;
    chapterNumber?: unknown;
    chapterTitle?: unknown;
    scrollPosition?: unknown;
    progressPercent?: unknown;
    note?: unknown;
  };

  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : null;
  const chapterNumber = Number(body.chapterNumber);
  const chapterTitle = typeof body.chapterTitle === "string" ? body.chapterTitle : null;
  const scrollPosition = Math.max(0, Math.round(Number(body.scrollPosition) || 0));
  const progressPercent = Math.min(100, Math.max(0, Number(body.progressPercent) || 0));
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  if (!storyId || !Number.isInteger(chapterNumber) || chapterNumber < 1) {
    return NextResponse.json({ error: "Invalid bookmark payload" }, { status: 400 });
  }

  const rows = await query<BookmarkRow>(
    `
      WITH saved AS (
        INSERT INTO reader_bookmarks (
          user_id, story_id, chapter_id, chapter_number, chapter_title,
          scroll_position, progress_percent, note, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
        ON CONFLICT (user_id, story_id, chapter_number)
        DO UPDATE SET
          chapter_id = EXCLUDED.chapter_id,
          chapter_title = EXCLUDED.chapter_title,
          scroll_position = EXCLUDED.scroll_position,
          progress_percent = EXCLUDED.progress_percent,
          note = COALESCE(EXCLUDED.note, reader_bookmarks.note),
          updated_at = now()
        RETURNING *
      )
      SELECT
        saved.id, saved.story_id, COALESCE(NULLIF(s.display_title, ''), s.title) AS story_title,
        s.cover_image_url, saved.chapter_id, saved.chapter_number, saved.chapter_title,
        saved.scroll_position, saved.progress_percent::text AS progress_percent,
        saved.note, saved.created_at, saved.updated_at
      FROM saved
      JOIN stories s ON s.id = saved.story_id
    `,
    [user.id, storyId, chapterId, chapterNumber, chapterTitle, scrollPosition, progressPercent, note]
  );

  return NextResponse.json({ item: mapBookmark(rows[0]) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true });

  const body = (await request.json().catch(() => ({}))) as {
    storyId?: unknown;
    chapterNumber?: unknown;
  };
  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const chapterNumber = Number(body.chapterNumber);

  if (!storyId || !Number.isInteger(chapterNumber) || chapterNumber < 1) {
    return NextResponse.json({ error: "Invalid bookmark payload" }, { status: 400 });
  }

  await query(
    `
      DELETE FROM reader_bookmarks
      WHERE user_id = $1
        AND story_id = $2
        AND chapter_number = $3
    `,
    [user.id, storyId, chapterNumber]
  );

  return NextResponse.json({ ok: true });
}
