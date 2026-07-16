import { NextResponse } from "next/server";
import {
  cleanAuthInput,
  createSession,
  createUser,
  findUsersByEmail,
  findUserByUsername
} from "@/lib/auth";
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  if (process.env.READER_SIGNUP_DISABLED === "1") {
    return NextResponse.json({ error: "Đăng ký tài khoản mới đã tắt." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { username?: unknown; email?: unknown; password?: unknown };
    const username = cleanAuthInput(body.username);
    const email = cleanAuthInput(body.email).toLowerCase();
    const password = cleanAuthInput(body.password);

    if (username.length < 3 || username.length > 32) {
      return NextResponse.json({ error: "Tên tài khoản cần 3-32 ký tự." }, { status: 400 });
    }

    if (username.includes("@")) {
      return NextResponse.json(
        { error: "Tên tài khoản không được chứa ký tự @. Dùng trường email riêng." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Email hợp lệ là bắt buộc khi nhập môn." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu cần ít nhất 8 ký tự." }, { status: 400 });
    }

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: "Tên tài khoản đã tồn tại." }, { status: 409 });
    }

    const emailMatches = await findUsersByEmail(email);
    if (emailMatches.length > 0) {
      return NextResponse.json({ error: "Email đã được dùng bởi tài khoản khác." }, { status: 409 });
    }

    const user = await createUser(username, email, password);
    await createSession(user.id);

    await invalidateUnusedTokens(user.id, "verify");
    const token = await createEmailToken(user.id, "verify");
    const mail = await sendVerifyEmail({ to: email, username: user.username, token });

    return NextResponse.json({
      user,
      mailSent: mail.ok,
      mailWarning: mail.ok
        ? undefined
        : "Tài khoản đã tạo nhưng chưa gửi được email xác thực. Vào Động phủ để gửi lại."
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Tên tài khoản hoặc email đã tồn tại." },
        { status: 409 }
      );
    }
    console.error("signup failed:", error);
    return NextResponse.json({ error: "Không tạo được tài khoản." }, { status: 500 });
  }
}
