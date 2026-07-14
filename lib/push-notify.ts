import { formatChapterLabel } from "@/lib/chapter-title";
import { query } from "@/lib/db";
import { sendPush, VAPID_PUBLIC } from "@/lib/push";
import { slugify } from "@/lib/urls";

type SubRow = { endpoint: string; p256dh: string; auth: string };

export type ChapterPushParams = {
  storyId: string;
  chapterNumber: number;
  storyTitle?: string | null;
  chapterTitle?: string | null;
};

/** Users who follow or have read this story, still behind the new chapter, with push enabled. */
async function loadChapterPushSubscriptions(storyId: string, chapterNumber: number): Promise<SubRow[]> {
  return query<SubRow>(
    `
      SELECT DISTINCT ps.endpoint, ps.p256dh, ps.auth
      FROM reader_push_subscriptions ps
      LEFT JOIN reader_reading_progress rp
        ON rp.user_id = ps.user_id AND rp.story_id = $1
      LEFT JOIN reader_story_follows rf
        ON rf.user_id = ps.user_id AND rf.story_id = $1
      WHERE (
          rf.user_id IS NOT NULL
          OR COALESCE(rp.max_read_chapter_number, 0) > 0
        )
        AND COALESCE(rp.max_read_chapter_number, 0) < $2
    `,
    [storyId, chapterNumber]
  );
}

async function resolveStoryTitle(storyId: string, provided?: string | null): Promise<string> {
  const trimmed = provided?.trim();
  if (trimmed) return trimmed;
  const rows = await query<{ title: string }>(
    `SELECT COALESCE(NULLIF(display_title, ''), title) AS title FROM stories WHERE id = $1 LIMIT 1`,
    [storyId]
  );
  return rows[0]?.title || "Truyện mới cập nhật";
}

async function resolveChapterTitle(storyId: string, chapterNumber: number, provided?: string | null): Promise<string> {
  const trimmed = provided?.trim();
  if (trimmed) return trimmed;
  if (chapterNumber <= 0) return "";
  const rows = await query<{ title: string | null }>(
    `SELECT title FROM chapters WHERE story_id = $1 AND chapter_number = $2 LIMIT 1`,
    [storyId, chapterNumber]
  );
  return rows[0]?.title?.trim() || "";
}

async function deliverPushBatch(
  subs: SubRow[],
  payload: Record<string, unknown>
): Promise<{ sent: number; expired: number }> {
  if (subs.length === 0) return { sent: 0, expired: 0 };

  const results = await Promise.allSettled(subs.map((sub) => sendPush(sub.endpoint, sub, payload)));

  const expired: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const code = (result.reason as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) expired.push(subs[index].endpoint);
    }
  });

  if (expired.length > 0) {
    await query(`DELETE FROM reader_push_subscriptions WHERE endpoint = ANY($1)`, [expired]);
  }

  return { sent: subs.length, expired: expired.length };
}

export async function sendChapterPushToReaders(params: ChapterPushParams): Promise<{ sent: number; expired: number }> {
  if (!VAPID_PUBLIC || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: 0, expired: 0 };
  }

  const { storyId, chapterNumber } = params;
  if (chapterNumber <= 0) return { sent: 0, expired: 0 };

  const [storyTitle, chapterTitle, subs] = await Promise.all([
    resolveStoryTitle(storyId, params.storyTitle),
    resolveChapterTitle(storyId, chapterNumber, params.chapterTitle),
    loadChapterPushSubscriptions(storyId, chapterNumber)
  ]);

  const storyKey = `${slugify(storyTitle)}-${storyId}`;
  const url = `/stories/${storyKey}/chapters/${chapterNumber}`;

  return deliverPushBatch(subs, {
    title: storyTitle,
    body: chapterTitle ? formatChapterLabel(chapterNumber, chapterTitle) : `Chương ${chapterNumber} mới`,
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    storyId,
    chapterNumber,
    url
  });
}

/** @deprecated Use sendChapterPushToReaders */
export const sendChapterPushToFollowers = sendChapterPushToReaders;
