import { NextResponse } from "next/server";
import { cleanAuthInput, createSession, createUser, findUserByUsername } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.READER_SIGNUP_DISABLED === "1") {
    return NextResponse.json({ error: "Đăng ký tài khoản mới đã tắt." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { username?: unknown; email?: unknown; password?: unknown };
    const username = cleanAuthInput(body.username);
    const email = cleanAuthInput(body.email) || null;
    const password = cleanAuthInput(body.password);

    if (username.length < 3 || username.length > 32) {
      return NextResponse.json({ error: "Tên tài khoản cần 3-32 ký tự." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu cần ít nhất 8 ký tự." }, { status: 400 });
    }

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return NextResponse.json({ error: "Tên tài khoản đã tồn tại." }, { status: 409 });
    }

    const user = await createUser(username, email, password);
    await createSession(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("signup failed:", error);
    return NextResponse.json({ error: "Không tạo được tài khoản." }, { status: 500 });
  }
}
