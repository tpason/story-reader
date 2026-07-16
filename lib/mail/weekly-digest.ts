import { query } from "@/lib/db";
import { getSiteUrl } from "@/lib/mail/site-url";
import {
  claimDigestSend,
  completeDigestSend,
  issueUnsubscribeToken,
  releaseDigestClaim
} from "@/lib/mail/preferences";
import { sendWeeklyDigestEmail } from "@/lib/mail/send";
import { slugify } from "@/lib/urls";

const BATCH_SIZE = 20;

type DigestUserRow = {
  user_id: string;
  username: string;
  email: string;
  weekly_digest: boolean;
  new_stories_digest: boolean;
  unsubscribe_token_hash: string | null;
  last_digest_run_id: string | null;
  digest_claim_run_id: string | null;
};

type ChapterRow = {
  story_id: string;
  story_title: string;
  total_chapters: number;
  max_read_chapter_number: number;
};

type NewStoryRow = {
  id: string;
  title: string;
  author: string | null;
};

function isoWeekRunId(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function loadDigestUsers() {
  return query<DigestUserRow>(
    `
      SELECT
        u.id::text AS user_id,
        u.username,
        u.email,
        COALESCE(p.weekly_digest, false) AS weekly_digest,
        COALESCE(p.new_stories_digest, false) AS new_stories_digest,
        p.last_digest_run_id,
        p.digest_claim_run_id
      FROM reader_users u
      JOIN reader_email_preferences p ON p.user_id = u.id
      WHERE u.email IS NOT NULL
        AND u.email_verified_at IS NOT NULL
        AND (p.weekly_digest = true OR p.new_stories_digest = true)
    `
  );
}

async function loadChapterDigest(userId: string) {
  return query<ChapterRow>(
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
        s.total_chapters,
        COALESCE(rp.max_read_chapter_number, 0) AS max_read_chapter_number
      FROM interested_stories ist
      JOIN stories s ON s.id = ist.story_id
      LEFT JOIN reader_reading_progress rp ON rp.user_id = $1 AND rp.story_id = s.id
      WHERE s.is_active = TRUE
        AND s.total_chapters > COALESCE(rp.max_read_chapter_number, 0)
        AND s.updated_at >= now() - interval '7 days'
      ORDER BY s.updated_at DESC
      LIMIT 12
    `,
    [userId]
  );
}

async function loadNewStories() {
  return query<NewStoryRow>(
    `
      SELECT
        id::text,
        COALESCE(NULLIF(display_title, ''), title) AS title,
        author
      FROM stories
      WHERE is_active = TRUE
        AND created_at >= now() - interval '7 days'
      ORDER BY created_at DESC
      LIMIT 8
    `
  );
}

function mapChapterItems(rows: ChapterRow[]) {
  const base = getSiteUrl();
  return rows.map((row) => {
    const unread = Math.max(0, Number(row.total_chapters) - Number(row.max_read_chapter_number));
    const nextChapter = unread > 0 ? Number(row.max_read_chapter_number) + 1 : null;
    return {
      storyTitle: row.story_title,
      storyHref: `${base}/stories/${slugify(row.story_title)}-${row.story_id}`,
      unread,
      nextChapter
    };
  });
}

function mapNewStoryItems(rows: NewStoryRow[]) {
  const base = getSiteUrl();
  return rows.map((row) => ({
    title: row.title,
    href: `${base}/stories/${slugify(row.title)}-${row.id}`,
    author: row.author
  }));
}

export async function runWeeklyDigest(runId = isoWeekRunId()) {
  const users = await loadDigestUsers();
  const newStoriesCache = await loadNewStories();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < users.length; index += BATCH_SIZE) {
    const batch = users.slice(index, index + BATCH_SIZE);
    for (const user of batch) {
      if (user.last_digest_run_id === runId) {
        skipped += 1;
        continue;
      }

      const chapters = user.weekly_digest ? mapChapterItems(await loadChapterDigest(user.user_id)) : [];
      const newStories = user.new_stories_digest ? mapNewStoryItems(newStoriesCache) : [];
      if (chapters.length === 0 && newStories.length === 0) {
        skipped += 1;
        continue;
      }

      const claimed = await claimDigestSend(user.user_id, runId);
      if (!claimed) {
        skipped += 1;
        continue;
      }

      const unsubscribeToken = await issueUnsubscribeToken(user.user_id);
      const result = await sendWeeklyDigestEmail({
        to: user.email,
        username: user.username,
        chapters,
        newStories,
        unsubscribeToken
      });

      if (!result.ok) {
        failed += 1;
        await releaseDigestClaim(user.user_id, runId);
        console.error("[digest] send failed for user", user.user_id);
        continue;
      }

      await completeDigestSend(user.user_id, runId);
      sent += 1;
    }
  }

  return { runId, sent, skipped, failed, total: users.length };
}
