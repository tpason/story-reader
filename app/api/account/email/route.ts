import { NextResponse } from "next/server";
import { attachUserEmail, cleanAuthInput, findUsersByEmail, getCurrentUser } from "@/lib/auth";
import { sendVerifyEmail } from "@/lib/mail/send";
import { createEmailToken, invalidateUnusedTokens } from "@/lib/mail/tokens";

export const dynamic = "force-dynamic";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { email?: unknown };
    const email = cleanAuthInput(body.email).toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
    }

    if (user.email && user.emailVerified) {
      return NextResponse.json(
        { error: "Email đã xác thực. Đổi email sẽ có trong bản cập nhật sau." },
        { status: 400 }
      );
    }

    const matches = await findUsersByEmail(email);
    if (matches.some((row) => row.id !== user.id)) {
      return NextResponse.json({ error: "Email đã được dùng bởi tài khoản khác." }, { status: 409 });
    }

    const updated = await attachUserEmail(user.id, email);
    if (!updated?.email) {
      return NextResponse.json({ error: "Không gắn được email." }, { status: 500 });
    }

    await invalidateUnusedTokens(user.id, "verify");
    const token = await createEmailToken(user.id, "verify");
    const mail = await sendVerifyEmail({
      to: updated.email,
      username: updated.username,
      token
    });

    return NextResponse.json({
      user: updated,
      mailSent: mail.ok,
      mailWarning: mail.ok ? undefined : "Không gửi được email xác thực. Hãy thử lại sau."
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "Email đã được dùng bởi tài khoản khác." }, { status: 409 });
    }
    console.error("attach email failed:", error);
    return NextResponse.json({ error: "Không cập nhật được email." }, { status: 500 });
  }
}
