import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendVerifyEmail } from "@/lib/mail/send";
import { getClientIp } from "@/lib/mail/request-ip";
import { checkThrottle, hashClientIp, resendVerifyRules } from "@/lib/mail/throttle";
import { createEmailToken, invalidateUnusedTokens } from "@/lib/mail/tokens";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Chưa có email trên tài khoản." }, { status: 400 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const ipHash = hashClientIp(getClientIp(request));
  const allowed = await checkThrottle("resend_verify", resendVerifyRules(user.id, ipHash));
  if (!allowed) {
    return NextResponse.json(
      { error: "Gửi lại quá nhanh. Hãy thử lại sau vài phút." },
      { status: 429 }
    );
  }

  await invalidateUnusedTokens(user.id, "verify");
  const token = await createEmailToken(user.id, "verify");
  const mail = await sendVerifyEmail({ to: user.email, username: user.username, token });

  return NextResponse.json({
    ok: true,
    mailSent: mail.ok,
    mailWarning: mail.ok ? undefined : "Không gửi được email xác thực. Hãy thử lại sau hoặc liên hệ hỗ trợ."
  });
}
