import { NextResponse } from "next/server";
import { findUsersByEmail } from "@/lib/auth";
import { sendResetPasswordEmail } from "@/lib/mail/send";
import { getClientIp } from "@/lib/mail/request-ip";
import { checkThrottle, forgotPasswordRules, hashClientIp } from "@/lib/mail/throttle";
import { createEmailToken, invalidateUnusedTokens } from "@/lib/mail/tokens";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const GENERIC_MESSAGE =
  "Nếu email tồn tại và đã xác thực, chúng tôi đã gửi liên kết đặt lại mật khẩu.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const ipHash = hashClientIp(getClientIp(request));
    const allowed = await checkThrottle("forgot_password", forgotPasswordRules(email, ipHash));
    if (!allowed) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const matches = await findUsersByEmail(email);
    if (matches.length !== 1) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    const row = matches[0];
    const verified = await query<{ email_verified_at: Date | null }>(
      `SELECT email_verified_at FROM reader_users WHERE id = $1`,
      [row.id]
    );
    if (!verified[0]?.email_verified_at || !row.email) {
      return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
    }

    await invalidateUnusedTokens(row.id, "reset");
    const token = await createEmailToken(row.id, "reset");
    await sendResetPasswordEmail({ to: row.email, username: row.username, token }).catch(() => undefined);

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("forgot-password failed:", error);
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }
}
