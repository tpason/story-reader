import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần nhập môn để bật thông báo" }, { status: 401 });
  }

  const body = (await request.json()) as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
    userAgent?: unknown;
  };

  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  const userAgent = typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  await query(
    `
      INSERT INTO reader_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id    = EXCLUDED.user_id,
        p256dh     = EXCLUDED.p256dh,
        auth       = EXCLUDED.auth,
        updated_at = now()
    `,
    [user.id, endpoint, p256dh, auth, userAgent]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { endpoint?: unknown };
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";

  if (!endpoint) return NextResponse.json({ ok: true });

  await query(`DELETE FROM reader_push_subscriptions WHERE endpoint = $1`, [endpoint]);
  return NextResponse.json({ ok: true });
}
