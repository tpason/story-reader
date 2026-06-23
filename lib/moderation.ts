import { query } from "@/lib/db";

export const COMMENT_REPORT_REASONS = [
  "spam",
  "harassment",
  "spoiler",
  "inappropriate",
  "other"
] as const;

export type CommentReportReason = (typeof COMMENT_REPORT_REASONS)[number];

type BanRow = {
  comment_banned_until: Date | null;
  comment_banned_permanent: boolean;
};

export function isCommentBanned(row: BanRow, now = new Date()) {
  if (row.comment_banned_permanent) return true;
  if (!row.comment_banned_until) return false;
  return row.comment_banned_until.getTime() > now.getTime();
}

export async function getCommentBanStatus(userId: string) {
  const rows = await query<BanRow>(
    `
      SELECT comment_banned_until, comment_banned_permanent
      FROM reader_users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );
  const row = rows[0];
  if (!row) return { banned: false, until: null as string | null, permanent: false };
  const banned = isCommentBanned(row);
  return {
    banned,
    until: row.comment_banned_until?.toISOString() ?? null,
    permanent: row.comment_banned_permanent
  };
}

export async function listBlockedUserIds(viewerId: string) {
  const rows = await query<{ blocked_id: string }>(
    `
      SELECT blocked_id
      FROM reader_user_blocks
      WHERE blocker_id = $1
    `,
    [viewerId]
  );
  return rows.map((row) => row.blocked_id);
}

export function commentBanMessage(until: string | null, permanent: boolean) {
  if (permanent) return "Đạo hữu đã bị phong cấm luận đạo vĩnh viễn.";
  if (until) {
    const date = new Date(until).toLocaleString("vi-VN");
    return `Đạo hữu đang bị phong cấm luận đạo đến ${date}.`;
  }
  return "Đạo hữu không thể luận đạo lúc này.";
}
