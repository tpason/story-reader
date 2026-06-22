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

async function fetchCommentRow(commentId: string, chapterId: string) {
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
      WHERE c.id = $1
        AND c.chapter_id = $2
      LIMIT 1
    `,
    [commentId, chapterId]
  );
  return rows[0] ?? null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chapterId: string; commentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });

  const { chapterId, commentId } = await params;
  const existing = await fetchCommentRow(commentId, chapterId);
  if (!existing || existing.deleted_at) {
    return NextResponse.json({ error: "Không tìm thấy bình luận." }, { status: 404 });
  }
  if (existing.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền sửa bình luận này." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { content?: unknown; contentJson?: unknown };
  const content = cleanComment(body.content);
  const contentJson = cleanCommentJson(body.contentJson, content);
  if (content.length < 2) {
    return NextResponse.json({ error: "Đạo luận cần ít nhất 2 ký tự." }, { status: 400 });
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: `Đạo luận tối đa ${MAX_COMMENT_LENGTH} ký tự.` }, { status: 400 });
  }

  await query(
    `
      UPDATE chapter_comments
      SET content_text = $3,
          content_json = $4::jsonb,
          updated_at = now()
      WHERE id = $1
        AND chapter_id = $2
    `,
    [commentId, chapterId, content, JSON.stringify(contentJson)]
  );

  const row = await fetchCommentRow(commentId, chapterId);
  if (!row) return NextResponse.json({ error: "Không tìm thấy bình luận." }, { status: 404 });
  return NextResponse.json({ item: mapComment(row) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ chapterId: string; commentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });

  const { chapterId, commentId } = await params;
  const existing = await fetchCommentRow(commentId, chapterId);
  if (!existing || existing.deleted_at) {
    return NextResponse.json({ error: "Không tìm thấy bình luận." }, { status: 404 });
  }
  if (existing.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền xóa bình luận này." }, { status: 403 });
  }

  await query(
    `
      UPDATE chapter_comments
      SET deleted_at = now(),
          updated_at = now()
      WHERE id = $1
        AND chapter_id = $2
    `,
    [commentId, chapterId]
  );

  const row = await fetchCommentRow(commentId, chapterId);
  if (!row) return NextResponse.json({ ok: true });
  return NextResponse.json({ item: mapComment(row) });
}
