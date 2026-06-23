import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type BlockRow = {
  blocked_id: string;
  username: string;
  created_at: Date;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });

  const rows = await query<BlockRow>(
    `
      SELECT b.blocked_id, u.username, b.created_at
      FROM reader_user_blocks b
      JOIN reader_users u ON u.id = b.blocked_id
      WHERE b.blocker_id = $1
      ORDER BY b.created_at DESC
    `,
    [user.id]
  );

  return NextResponse.json({
    items: rows.map((row) => ({
      userId: row.blocked_id,
      username: row.username,
      blockedAt: row.created_at.toISOString()
    }))
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { userId?: unknown };
  const blockedId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!blockedId) return NextResponse.json({ error: "Thiếu userId." }, { status: 400 });
  if (blockedId === user.id) {
    return NextResponse.json({ error: "Không thể tự phong ấn chính mình." }, { status: 400 });
  }

  const targetRows = await query<{ id: string }>(
    `SELECT id FROM reader_users WHERE id = $1 LIMIT 1`,
    [blockedId]
  );
  if (!targetRows[0]) return NextResponse.json({ error: "Không tìm thấy đạo hữu." }, { status: 404 });

  await query(
    `
      INSERT INTO reader_user_blocks (blocker_id, blocked_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    `,
    [user.id, blockedId]
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
