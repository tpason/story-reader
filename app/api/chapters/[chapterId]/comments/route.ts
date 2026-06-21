import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cultivationProfileForAuthor } from "@/lib/cultivation";
import { query } from "@/lib/db";
import { computeStreakFromReadDates, streakBonusXp } from "@/lib/reading-streak";

export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 1600;

type CommentRow = {
  id: string;
  story_id: string;
  chapter_id: string;
  user_id: string;
  parent_id: string | null;
  content_text: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  username: string;
  user_role: string;
  author_xp: string;
  read_dates: Date[] | null;
};

type ChapterRow = {
  id: string;
  story_id: string;
};

function cleanComment(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
}

function cleanCommentJson(value: unknown, fallbackText: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: fallbackText }] }]
    };
  }

  const json = value as { type?: unknown; content?: unknown };
  if (json.type !== "doc" || !Array.isArray(json.content)) {
    return {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: fallbackText }] }]
    };
  }

  return value;
}

function cultivationFromXp(xpValue: string, readDates: Date[] | null, isAdmin: boolean) {
  const readingXp = Math.max(0, Number(xpValue) || 0);
  const streak = computeStreakFromReadDates(
    (readDates ?? []).map((date) => date.toISOString().slice(0, 10))
  );
  const totalXp = readingXp + streakBonusXp(streak.currentStreak);
  return cultivationProfileForAuthor(totalXp, isAdmin);
}

function mapComment(row: CommentRow) {
  const isAdmin = row.user_role === "admin";
  return {
    id: row.id,
    storyId: row.story_id,
    chapterId: row.chapter_id,
    userId: row.user_id,
    parentId: row.parent_id,
    contentText: row.deleted_at ? "Bình luận đã bị phong ấn." : row.content_text,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
    author: {
      id: row.user_id,
      username: row.username,
      isAdmin,
      cultivation: cultivationFromXp(row.author_xp, row.read_dates, isAdmin)
    }
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;

  const rows = await query<CommentRow>(
    `
      WITH author_progress AS (
        SELECT user_id, COALESCE(SUM(max_read_chapter_number), 0) * 100 AS author_xp
        FROM reader_reading_progress
        GROUP BY user_id
      ),
      author_read_days AS (
        SELECT
          user_id,
          ARRAY_AGG(DISTINCT (last_read_at AT TIME ZONE 'UTC')::date ORDER BY (last_read_at AT TIME ZONE 'UTC')::date DESC) AS read_dates
        FROM reader_reading_progress
        GROUP BY user_id
      )
      SELECT
        c.id, c.story_id, c.chapter_id, c.user_id, c.parent_id, c.content_text,
        c.created_at, c.updated_at, c.deleted_at,
        u.username,
        u.role AS user_role,
        COALESCE(ap.author_xp, 0)::text AS author_xp,
        ard.read_dates
      FROM chapter_comments c
      JOIN reader_users u ON u.id = c.user_id
      LEFT JOIN author_progress ap ON ap.user_id = c.user_id
      LEFT JOIN author_read_days ard ON ard.user_id = c.user_id
      WHERE c.chapter_id = $1
      ORDER BY COALESCE(c.parent_id, c.id), c.parent_id NULLS FIRST, c.created_at ASC
      LIMIT 240
    `,
    [chapterId]
  );

  const comments = rows.map(mapComment);
  return NextResponse.json({
    items: comments.filter((item) => !item.parentId),
    replies: comments.filter((item) => item.parentId)
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tán tu chỉ có thể xem luận đạo. Hãy nhập môn để bình luận." }, { status: 401 });
  }

  const { chapterId } = await params;
  const body = (await request.json()) as { content?: unknown; contentJson?: unknown; parentId?: unknown };
  const content = cleanComment(body.content);
  const contentJson = cleanCommentJson(body.contentJson, content);
  const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;

  if (content.length < 2) {
    return NextResponse.json({ error: "Đạo luận cần ít nhất 2 ký tự." }, { status: 400 });
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Đạo luận tối đa ${MAX_COMMENT_LENGTH} ký tự.` }, { status: 400 });
  }

  const chapterRows = await query<ChapterRow>(
    `
      SELECT id, story_id
      FROM chapters
      WHERE id = $1
      LIMIT 1
    `,
    [chapterId]
  );

  const chapter = chapterRows[0];
  if (!chapter) {
    return NextResponse.json({ error: "Không tìm thấy chương." }, { status: 404 });
  }

  if (parentId) {
    const parentRows = await query<{ id: string }>(
      `
        SELECT id
        FROM chapter_comments
        WHERE id = $1
          AND chapter_id = $2
          AND parent_id IS NULL
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [parentId, chapterId]
    );

    if (!parentRows[0]) {
      return NextResponse.json({ error: "Không tìm thấy đạo luận gốc để hồi đáp." }, { status: 404 });
    }
  }

  const rows = await query<CommentRow>(
    `
      WITH inserted AS (
        INSERT INTO chapter_comments (
          story_id, chapter_id, user_id, parent_id, content_json, content_text
        )
        VALUES (
          $1, $2, $3, $4,
          $5::jsonb,
          $6
        )
        RETURNING *
      ),
      author_progress AS (
        SELECT user_id, COALESCE(SUM(max_read_chapter_number), 0) * 100 AS author_xp
        FROM reader_reading_progress
        WHERE user_id = $3
        GROUP BY user_id
      ),
      author_read_days AS (
        SELECT
          user_id,
          ARRAY_AGG(DISTINCT (last_read_at AT TIME ZONE 'UTC')::date ORDER BY (last_read_at AT TIME ZONE 'UTC')::date DESC) AS read_dates
        FROM reader_reading_progress
        WHERE user_id = $3
        GROUP BY user_id
      )
      SELECT
        i.id, i.story_id, i.chapter_id, i.user_id, i.parent_id, i.content_text,
        i.created_at, i.updated_at, i.deleted_at,
        u.username,
        u.role AS user_role,
        COALESCE(ap.author_xp, 0)::text AS author_xp,
        ard.read_dates
      FROM inserted i
      JOIN reader_users u ON u.id = i.user_id
      LEFT JOIN author_progress ap ON ap.user_id = i.user_id
      LEFT JOIN author_read_days ard ON ard.user_id = i.user_id
    `,
    [chapter.story_id, chapter.id, user.id, parentId, JSON.stringify(contentJson), content]
  );

  return NextResponse.json({ item: mapComment(rows[0]) }, { status: 201 });
}
