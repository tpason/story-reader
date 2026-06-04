import { NextResponse } from "next/server";
import { cleanAuthInput, createSession, findUserByUsername, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: unknown; password?: unknown };
    const username = cleanAuthInput(body.username);
    const password = cleanAuthInput(body.password);
    const user = await findUserByUsername(username);

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ error: "Tên tài khoản hoặc mật khẩu không đúng." }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.role === "admin"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Không đăng nhập được.", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
