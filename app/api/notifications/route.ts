import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type NotificationRow = {
  story_id: string;
  story_title: string;
  cover_image_url: string | null;
  author: string | null;
  total_chapters: number;
  max_read_chapter_number: number;
  updated_at: Date;
};

function mapNotification(row: NotificationRow) {
  const unread = Math.max(0, Number(row.total_chapters) - Number(row.max_read_chapter_number ?? 0));
  return {
    storyId: row.story_id,
    storyTitle: row.story_title,
    coverImageUrl: row.cover_image_url,
    author: row.author,
    totalChapters: Number(row.total_chapters),
    maxReadChapterNumber: Number(row.max_read_chapter_number ?? 0),
    unread,
    nextChapter: unread > 0 ? Number(row.max_read_chapter_number ?? 0) + 1 : null,
    updatedAt: row.updated_at.toISOString()
  };
}

function parseLocalStories(value: string | null) {
  if (!value) return [];
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return value
    .split(",")
    .map((item) => {
      const [storyId, chapter] = item.split(":");
      const maxRead = Number(chapter);
      if (!storyId || !uuidPattern.test(storyId) || !Number.isFinite(maxRead)) return null;
      return { storyId, maxRead: Math.max(0, Math.floor(maxRead)) };
    })
    .filter((item): item is { storyId: string; maxRead: number } => Boolean(item))
    .slice(0, 120);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const localStories = parseLocalStories(request.nextUrl.searchParams.get("stories"));

  if (user) {
    const rows = await query<NotificationRow>(
      `
        WITH interested_stories AS (
          SELECT story_id FROM reader_story_follows WHERE user_id = $1
          UNION
          SELECT story_id FROM reader_reading_progress
          WHERE user_id = $1 AND max_read_chapter_number > 0
        )
        SELECT
          s.id::text AS story_id,
          COALESCE(NULLIF(s.display_title, ''), s.title) AS story_title,
          s.cover_image_url,
          s.author,
          s.total_chapters,
          COALESCE(rp.max_read_chapter_number, 0) AS max_read_chapter_number,
          s.updated_at
        FROM interested_stories ist
        JOIN stories s ON s.id = ist.story_id
        LEFT JOIN reader_reading_progress rp ON rp.user_id = $1 AND rp.story_id = s.id
        WHERE s.is_active = TRUE
          AND s.total_chapters > COALESCE(rp.max_read_chapter_number, 0)
        ORDER BY s.updated_at DESC, s.total_chapters DESC
        LIMIT 80
      `,
      [user.id]
    );

    const items = rows.map(mapNotification);
    return NextResponse.json({
      items,
      unreadStories: items.length,
      unreadChapters: items.reduce((total, item) => total + item.unread, 0),
      serverTime: new Date().toISOString()
    });
  }

  if (localStories.length === 0) {
    return NextResponse.json({ items: [], unreadStories: 0, unreadChapters: 0, serverTime: new Date().toISOString() });
  }

  const values: unknown[] = [];
  const tuples = localStories.map((item) => {
    values.push(item.storyId, item.maxRead);
    return `($${values.length - 1}::uuid, $${values.length}::integer)`;
  });

  const rows = await query<NotificationRow>(
    `
      WITH local_progress(story_id, max_read_chapter_number) AS (
        VALUES ${tuples.join(", ")}
      )
      SELECT
        s.id::text AS story_id,
        COALESCE(NULLIF(s.display_title, ''), s.title) AS story_title,
        s.cover_image_url,
        s.author,
        s.total_chapters,
        lp.max_read_chapter_number,
        s.updated_at
      FROM local_progress lp
      JOIN stories s ON s.id = lp.story_id
      WHERE s.is_active = TRUE
        AND s.total_chapters > lp.max_read_chapter_number
      ORDER BY s.updated_at DESC, s.total_chapters DESC
      LIMIT 80
    `,
    values
  );

  const items = rows.map(mapNotification);
  return NextResponse.json({
    items,
    unreadStories: items.length,
    unreadChapters: items.reduce((total, item) => total + item.unread, 0),
    serverTime: new Date().toISOString()
  });
}
