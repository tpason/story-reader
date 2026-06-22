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

export async function sendChapterPushToFollowers(params: ChapterPushParams): Promise<{ sent: number; expired: number }> {
  if (!VAPID_PUBLIC || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: 0, expired: 0 };
  }

  const { storyId, chapterNumber } = params;
  let storyTitle = params.storyTitle?.trim() || "";
  let chapterTitle = params.chapterTitle?.trim() || "";

  if (!storyTitle) {
    const rows = await query<{ title: string }>(
      `SELECT COALESCE(NULLIF(display_title, ''), title) AS title FROM stories WHERE id = $1 LIMIT 1`,
      [storyId]
    );
    storyTitle = rows[0]?.title || "Truyện mới cập nhật";
  }

  if (!chapterTitle && chapterNumber > 0) {
    const rows = await query<{ title: string | null }>(
      `SELECT title FROM chapters WHERE story_id = $1 AND chapter_number = $2 LIMIT 1`,
      [storyId, chapterNumber]
    );
    chapterTitle = rows[0]?.title?.trim() || "";
  }

  const subs = await query<SubRow>(
    `
      SELECT ps.endpoint, ps.p256dh, ps.auth
      FROM reader_push_subscriptions ps
      JOIN reader_story_follows rf ON rf.user_id = ps.user_id
      WHERE rf.story_id = $1
    `,
    [storyId]
  );

  if (subs.length === 0) return { sent: 0, expired: 0 };

  const storyKey = `${slugify(storyTitle)}-${storyId}`;
  const url = chapterNumber ? `/stories/${storyKey}/chapters/${chapterNumber}` : `/stories/${storyKey}`;

  const payload = {
    title: storyTitle,
    body: chapterTitle ? `Chương ${chapterNumber}: ${chapterTitle}` : `Chương ${chapterNumber} mới`,
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    storyId,
    chapterNumber,
    url
  };

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
