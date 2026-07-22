import { unstable_cache } from "next/cache";
import { query } from "@/lib/db";

export type RecentCommentItem = {
  id: string;
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterNumber: number;
  userId: string;
  authorUsername: string;
  contentText: string;
  createdAt: string;
  parentId: string | null;
};

type RecentCommentRow = {
  id: string;
  story_id: string;
  story_title: string;
  chapter_id: string;
  chapter_number: number;
  user_id: string;
  username: string;
  content_text: string;
  created_at: Date;
  parent_id: string | null;
};

function mapRow(row: RecentCommentRow): RecentCommentItem {
  return {
    id: row.id,
    storyId: row.story_id,
    storyTitle: row.story_title,
    chapterId: row.chapter_id,
    chapterNumber: row.chapter_number,
    userId: row.user_id,
    authorUsername: row.username,
    contentText: row.content_text,
    createdAt: row.created_at.toISOString(),
    parentId: row.parent_id
  };
}

export async function listRecentComments(limit = 10): Promise<RecentCommentItem[]> {
  const safeLimit = Math.min(40, Math.max(1, Math.floor(limit) || 10));

  const rows = await query<RecentCommentRow>(
    `
      SELECT
        c.id,
        c.story_id,
        COALESCE(NULLIF(s.display_title, ''), s.title) AS story_title,
        c.chapter_id,
        ch.chapter_number,
        c.user_id,
        u.username,
        c.content_text,
        c.created_at,
        c.parent_id
      FROM chapter_comments c
      JOIN reader_users u ON u.id = c.user_id
      JOIN chapters ch ON ch.id = c.chapter_id
      JOIN stories s ON s.id = c.story_id
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return rows.map(mapRow);
}

export const getCachedRecentComments = unstable_cache(
  async (limit: number) => listRecentComments(limit),
  ["recent-comments-rail"],
  { revalidate: 60 }
);

export function snippetCommentText(text: string, max = 120) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}
