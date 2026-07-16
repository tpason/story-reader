import { randomBytes } from "node:crypto";
import { query } from "@/lib/db";
import { hashOpaqueToken } from "@/lib/mail/tokens";

export async function ensureEmailPreferences(userId: string) {
  await query(
    `
      INSERT INTO reader_email_preferences (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [userId]
  );
}

export type EmailPreferences = {
  weeklyDigest: boolean;
  newStoriesDigest: boolean;
  lastWeeklySentAt: string | null;
};

export async function getEmailPreferences(userId: string): Promise<EmailPreferences> {
  await ensureEmailPreferences(userId);
  const rows = await query<{
    weekly_digest: boolean;
    new_stories_digest: boolean;
    last_weekly_sent_at: Date | null;
  }>(
    `
      SELECT weekly_digest, new_stories_digest, last_weekly_sent_at
      FROM reader_email_preferences
      WHERE user_id = $1
    `,
    [userId]
  );
  const row = rows[0];
  return {
    weeklyDigest: row?.weekly_digest ?? false,
    newStoriesDigest: row?.new_stories_digest ?? false,
    lastWeeklySentAt: row?.last_weekly_sent_at?.toISOString() ?? null
  };
}

export async function updateEmailPreferences(
  userId: string,
  patch: { weeklyDigest?: boolean; newStoriesDigest?: boolean }
) {
  await ensureEmailPreferences(userId);
  const rows = await query<{
    weekly_digest: boolean;
    new_stories_digest: boolean;
    last_weekly_sent_at: Date | null;
  }>(
    `
      UPDATE reader_email_preferences
      SET
        weekly_digest = COALESCE($2, weekly_digest),
        new_stories_digest = COALESCE($3, new_stories_digest),
        updated_at = now()
      WHERE user_id = $1
      RETURNING weekly_digest, new_stories_digest, last_weekly_sent_at
    `,
    [userId, patch.weeklyDigest ?? null, patch.newStoriesDigest ?? null]
  );
  const row = rows[0];
  return {
    weeklyDigest: row.weekly_digest,
    newStoriesDigest: row.new_stories_digest,
    lastWeeklySentAt: row.last_weekly_sent_at?.toISOString() ?? null
  };
}

/** Rotate unsubscribe secret for one send; stores hash only. */
export async function issueUnsubscribeToken(userId: string) {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashOpaqueToken(raw);
  await query(
    `
      UPDATE reader_email_preferences
      SET unsubscribe_token_hash = $2,
          updated_at = now()
      WHERE user_id = $1
    `,
    [userId, tokenHash]
  );
  return raw;
}

export async function unsubscribeByToken(rawToken: string) {
  const tokenHash = hashOpaqueToken(rawToken);
  const rows = await query<{ user_id: string }>(
    `
      UPDATE reader_email_preferences
      SET weekly_digest = false,
          new_stories_digest = false,
          updated_at = now()
      WHERE unsubscribe_token_hash = $1
      RETURNING user_id
    `,
    [tokenHash]
  );
  return rows[0]?.user_id ?? null;
}

export async function claimDigestSend(userId: string, runId: string) {
  const rows = await query<{ user_id: string }>(
    `
      UPDATE reader_email_preferences
      SET digest_claim_run_id = $3,
          updated_at = now()
      WHERE user_id = $1
        AND COALESCE(last_digest_run_id, '') <> $2
        AND COALESCE(digest_claim_run_id, '') <> $2
      RETURNING user_id
    `,
    [userId, runId, runId]
  );
  return Boolean(rows[0]);
}

export async function completeDigestSend(userId: string, runId: string) {
  await query(
    `
      UPDATE reader_email_preferences
      SET last_weekly_sent_at = now(),
          last_digest_run_id = $2,
          digest_claim_run_id = NULL,
          updated_at = now()
      WHERE user_id = $1
        AND digest_claim_run_id = $2
    `,
    [userId, runId]
  );
}

export async function releaseDigestClaim(userId: string, runId: string) {
  await query(
    `
      UPDATE reader_email_preferences
      SET digest_claim_run_id = NULL,
          updated_at = now()
      WHERE user_id = $1
        AND digest_claim_run_id = $2
    `,
    [userId, runId]
  );
}
