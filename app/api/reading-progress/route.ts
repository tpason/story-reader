import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { countReadableWords } from "@/lib/reading-estimate";

export const dynamic = "force-dynamic";

type ProgressRow = {
  story_id: string;
  story_title: string;
  cover_image_url: string | null;
  total_chapters: number;
  chapter_id: string | null;
  chapter_number: number;
  chapter_title: string | null;
  scroll_position: number;
  paragraph_index: number;
  progress_percent: string;
  max_read_chapter_number: number;
  last_read_at: Date;
};

type NextChapterContentRow = {
  story_id: string;
  chapter_number: number;
  content: string | null;
};

const NEXT_CHAPTER_ESTIMATE_LIMIT = 40;

async function getNextChapterWordCounts(rows: ProgressRow[]) {
  if (rows.length === 0) return new Map<string, number[]>();

  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    values.push(row.story_id, row.max_read_chapter_number);
    const storyRef = `$${values.length - 1}::uuid`;
    const chapterRef = `$${values.length}::integer`;
    return `(${storyRef}, ${chapterRef})`;
  });

  const chapterRows = await query<NextChapterContentRow>(
    `
      WITH progress(story_id, max_read_chapter_number) AS (
        VALUES ${tuples.join(", ")}
      )
      SELECT
        p.story_id::text AS story_id,
        c.chapter_number,
        COALESCE(c.polished_text_content, c.translated_text_content, c.raw_text_content) AS content
      FROM progress p
      JOIN LATERAL (
        SELECT chapter_number, polished_text_content, translated_text_content, raw_text_content
        FROM chapters
        WHERE story_id = p.story_id
          AND chapter_number > p.max_read_chapter_number
        ORDER BY chapter_number ASC
        LIMIT ${NEXT_CHAPTER_ESTIMATE_LIMIT}
      ) c ON TRUE
      ORDER BY p.story_id, c.chapter_number ASC
    `,
    values
  );

  const byStory = new Map<string, number[]>();
  chapterRows.forEach((row) => {
    const counts = byStory.get(row.story_id) ?? [];
    counts.push(countReadableWords(row.content));
    byStory.set(row.story_id, counts);
  });

  return byStory;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ items: [] });
  }

  const rows = await query<ProgressRow>(
    `
      SELECT
        rp.story_id, COALESCE(NULLIF(s.display_title, ''), s.title) AS story_title, s.cover_image_url, s.total_chapters,
        rp.chapter_id, rp.chapter_number, rp.chapter_title, rp.scroll_position, rp.paragraph_index,
        rp.progress_percent::text AS progress_percent,
        rp.max_read_chapter_number, rp.last_read_at
      FROM reader_reading_progress rp
      JOIN stories s ON s.id = rp.story_id
      WHERE rp.user_id = $1
      ORDER BY rp.last_read_at DESC
      LIMIT 100
    `,
    [user.id]
  );
  const nextChapterWordCounts = await getNextChapterWordCounts(rows);

  return NextResponse.json({
    items: rows.map((row) => ({
      storyId: row.story_id,
      storyTitle: row.story_title,
      coverImageUrl: row.cover_image_url,
      totalChapters: row.total_chapters,
      chapterId: row.chapter_id,
      chapterNumber: row.chapter_number,
      chapterTitle: row.chapter_title,
      scrollPosition: row.scroll_position,
      paragraphIndex: row.paragraph_index,
      progressPercent: Number(row.progress_percent),
      maxReadChapterNumber: row.max_read_chapter_number,
      lastReadAt: row.last_read_at.toISOString(),
      nextChapterWordCounts: nextChapterWordCounts.get(row.story_id) ?? []
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần nhập môn để sync tu vi vào database" }, { status: 401 });
  }

  const body = (await request.json()) as {
    storyId?: unknown;
    chapterId?: unknown;
    chapterNumber?: unknown;
    chapterTitle?: unknown;
    scrollPosition?: unknown;
    paragraphIndex?: unknown;
    progressPercent?: unknown;
    maxReadChapterNumber?: unknown;
    totalChapters?: unknown;
  };

  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : null;
  const chapterNumber = Number(body.chapterNumber);
  const chapterTitle = typeof body.chapterTitle === "string" ? body.chapterTitle : null;
  const scrollPosition = Math.max(0, Math.round(Number(body.scrollPosition) || 0));
  const paragraphIndex = Math.max(0, Math.round(Number(body.paragraphIndex) || 0));
  const progressPercent = Math.min(100, Math.max(0, Number(body.progressPercent) || 0));
  const maxReadChapterNumber = Math.max(chapterNumber, Number(body.maxReadChapterNumber) || 0);
  const totalChapters = Math.max(0, Number(body.totalChapters) || 0);

  if (!storyId || !Number.isInteger(chapterNumber) || chapterNumber < 1) {
    return NextResponse.json({ error: "Invalid progress payload" }, { status: 400 });
  }

  await query(
    `
      INSERT INTO reader_reading_progress (
        user_id, story_id, chapter_id, chapter_number, chapter_title,
        scroll_position, paragraph_index, progress_percent, max_read_chapter_number,
        total_chapters, last_read_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
      ON CONFLICT (user_id, story_id)
      DO UPDATE SET
        chapter_id = EXCLUDED.chapter_id,
        chapter_number = EXCLUDED.chapter_number,
        chapter_title = EXCLUDED.chapter_title,
        scroll_position = EXCLUDED.scroll_position,
        paragraph_index = EXCLUDED.paragraph_index,
        progress_percent = EXCLUDED.progress_percent,
        max_read_chapter_number = GREATEST(reader_reading_progress.max_read_chapter_number, EXCLUDED.max_read_chapter_number),
        total_chapters = EXCLUDED.total_chapters,
        last_read_at = now(),
        updated_at = now()
    `,
    [user.id, storyId, chapterId, chapterNumber, chapterTitle, scrollPosition, paragraphIndex, progressPercent, maxReadChapterNumber, totalChapters]
  );

  return NextResponse.json({ ok: true });
}
