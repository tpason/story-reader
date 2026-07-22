import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * In-reader admin shortcut to ban a user from luận đạo.
 * Primary moderation UI remains story_admin `/moderation`.
 */
export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Tổng quản mới phong cấm luận đạo." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: unknown;
    permanent?: unknown;
    banDays?: unknown;
    banned?: unknown;
  };

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "Thiếu userId." }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json({ error: "Không thể tự phong cấm chính mình." }, { status: 400 });
  }

  const target = await query<{ id: string; role: string }>(
    `SELECT id, role FROM reader_users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  if (!target[0]) {
    return NextResponse.json({ error: "Không tìm thấy đạo hữu." }, { status: 404 });
  }
  if (target[0].role === "admin") {
    return NextResponse.json({ error: "Không thể phong cấm Tổng quản khác." }, { status: 403 });
  }

  // Unban
  if (body.banned === false) {
    await query(
      `
        UPDATE reader_users
        SET comment_banned_permanent = FALSE,
            comment_banned_until = NULL,
            updated_at = now()
        WHERE id = $1
      `,
      [userId]
    );
    return NextResponse.json({ ok: true, banned: false });
  }

  if (body.permanent === true) {
    await query(
      `
        UPDATE reader_users
        SET comment_banned_permanent = TRUE,
            comment_banned_until = NULL,
            updated_at = now()
        WHERE id = $1
      `,
      [userId]
    );
    return NextResponse.json({ ok: true, banned: true, permanent: true });
  }

  const daysRaw = Number(body.banDays ?? 7);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(365, Math.floor(daysRaw))) : 7;

  await query(
    `
      UPDATE reader_users
      SET comment_banned_until = now() + ($2::text || ' days')::interval,
          comment_banned_permanent = FALSE,
          updated_at = now()
      WHERE id = $1
    `,
    [userId, String(days)]
  );

  return NextResponse.json({ ok: true, banned: true, permanent: false, banDays: days });
}
