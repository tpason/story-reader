import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type ParagraphBookmarkRow = {
  id: string;
  story_id: string;
  chapter_id: string;
  chapter_number: number;
  chapter_title: string;
  paragraph_index: number;
  excerpt: string;
  progress_percent: string;
  note: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapParagraphBookmark(row: ParagraphBookmarkRow) {
  return {
    id: row.id,
    storyId: row.story_id,
    chapterId: row.chapter_id,
    chapterNumber: row.chapter_number,
    chapterTitle: row.chapter_title,
    paragraphIndex: row.paragraph_index,
    excerpt: row.excerpt,
    progressPercent: Number(row.progress_percent),
    note: row.note,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(request.url);
  const storyId = searchParams.get("storyId");
  const chapterNumber = Number(searchParams.get("chapterNumber"));
  const values: unknown[] = [user.id];
  const where = ["user_id = $1"];

  if (storyId) {
    values.push(storyId);
    where.push(`story_id = $${values.length}`);
  }

  if (Number.isInteger(chapterNumber) && chapterNumber > 0) {
    values.push(chapterNumber);
    where.push(`chapter_number = $${values.length}`);
  }

  const rows = await query<ParagraphBookmarkRow>(
    `
      SELECT id, story_id, chapter_id, chapter_number, chapter_title,
        paragraph_index, excerpt, progress_percent::text AS progress_percent,
        note, created_at, updated_at
      FROM reader_paragraph_bookmarks
      WHERE ${where.join(" AND ")}
      ORDER BY updated_at DESC
      LIMIT 240
    `,
    values
  );

  return NextResponse.json({ items: rows.map(mapParagraphBookmark) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập để sync dấu đoạn." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    storyId?: unknown;
    chapterId?: unknown;
    chapterNumber?: unknown;
    chapterTitle?: unknown;
    paragraphIndex?: unknown;
    excerpt?: unknown;
    progressPercent?: unknown;
    note?: unknown;
  };

  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : null;
  const chapterNumber = Number(body.chapterNumber);
  const chapterTitle = typeof body.chapterTitle === "string" ? body.chapterTitle.slice(0, 240) : "";
  const paragraphIndex = Number(body.paragraphIndex);
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim().slice(0, 320) : "";
  const progressPercent = Math.min(100, Math.max(0, Number(body.progressPercent) || 0));
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  if (!storyId || !Number.isInteger(chapterNumber) || chapterNumber < 1 || !Number.isInteger(paragraphIndex) || paragraphIndex < 0) {
    return NextResponse.json({ error: "Invalid paragraph bookmark payload" }, { status: 400 });
  }

  const rows = await query<ParagraphBookmarkRow>(
    `
      INSERT INTO reader_paragraph_bookmarks (
        user_id, story_id, chapter_id, chapter_number, chapter_title,
        paragraph_index, excerpt, progress_percent, note, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
      ON CONFLICT (user_id, story_id, chapter_number, paragraph_index)
      DO UPDATE SET
        chapter_id = EXCLUDED.chapter_id,
        chapter_title = EXCLUDED.chapter_title,
        excerpt = EXCLUDED.excerpt,
        progress_percent = EXCLUDED.progress_percent,
        note = COALESCE(EXCLUDED.note, reader_paragraph_bookmarks.note),
        updated_at = now()
      RETURNING id, story_id, chapter_id, chapter_number, chapter_title,
        paragraph_index, excerpt, progress_percent::text AS progress_percent,
        note, created_at, updated_at
    `,
    [user.id, storyId, chapterId, chapterNumber, chapterTitle, paragraphIndex, excerpt, progressPercent, note]
  );

  return NextResponse.json({ item: mapParagraphBookmark(rows[0]) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true });

  const body = (await request.json().catch(() => ({}))) as {
    storyId?: unknown;
    chapterNumber?: unknown;
    paragraphIndex?: unknown;
  };

  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const chapterNumber = Number(body.chapterNumber);
  const paragraphIndex = Number(body.paragraphIndex);

  if (!storyId || !Number.isInteger(chapterNumber) || chapterNumber < 1 || !Number.isInteger(paragraphIndex) || paragraphIndex < 0) {
    return NextResponse.json({ error: "Invalid paragraph bookmark payload" }, { status: 400 });
  }

  await query(
    `
      DELETE FROM reader_paragraph_bookmarks
      WHERE user_id = $1
        AND story_id = $2
        AND chapter_number = $3
        AND paragraph_index = $4
    `,
    [user.id, storyId, chapterNumber, paragraphIndex]
  );

  return NextResponse.json({ ok: true });
}
