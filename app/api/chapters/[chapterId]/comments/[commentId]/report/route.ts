import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { COMMENT_REPORT_REASONS, type CommentReportReason } from "@/lib/moderation";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_DETAILS_LENGTH = 500;

function parseReason(value: unknown): CommentReportReason | null {
  if (typeof value !== "string") return null;
  return COMMENT_REPORT_REASONS.includes(value as CommentReportReason)
    ? (value as CommentReportReason)
    : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chapterId: string; commentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập để báo cáo." }, { status: 401 });

  const { chapterId, commentId } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: unknown; details?: unknown };
  const reason = parseReason(body.reason);
  if (!reason) {
    return NextResponse.json({ error: "Lý do báo cáo không hợp lệ." }, { status: 400 });
  }

  const details =
    typeof body.details === "string" ? body.details.trim().slice(0, MAX_DETAILS_LENGTH) : "";

  const commentRows = await query<{ id: string; user_id: string; deleted_at: Date | null }>(
    `
      SELECT id, user_id, deleted_at
      FROM chapter_comments
      WHERE id = $1
        AND chapter_id = $2
      LIMIT 1
    `,
    [commentId, chapterId]
  );
  const comment = commentRows[0];
  if (!comment || comment.deleted_at) {
    return NextResponse.json({ error: "Không tìm thấy bình luận." }, { status: 404 });
  }
  if (comment.user_id === user.id) {
    return NextResponse.json({ error: "Không thể báo cáo bình luận của chính mình." }, { status: 400 });
  }

  const rows = await query<{ id: string }>(
    `
      INSERT INTO comment_reports (comment_id, reporter_id, reason, details)
      VALUES ($1, $2, $3, NULLIF($4, ''))
      ON CONFLICT (comment_id, reporter_id) DO UPDATE
        SET reason = EXCLUDED.reason,
            details = EXCLUDED.details,
            status = 'pending',
            reviewed_by = NULL,
            reviewed_at = NULL,
            admin_note = NULL,
            created_at = now()
      RETURNING id
    `,
    [commentId, user.id, reason, details]
  );

  return NextResponse.json({ ok: true, reportId: rows[0]?.id }, { status: 201 });
}
