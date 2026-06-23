import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });

  const { userId } = await params;
  await query(
    `
      DELETE FROM reader_user_blocks
      WHERE blocker_id = $1
        AND blocked_id = $2
    `,
    [user.id, userId]
  );

  return NextResponse.json({ ok: true });
}
