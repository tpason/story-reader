import { NextResponse } from "next/server";
import {
  cleanAuthInput,
  createSession,
  findUserByUsername,
  findUsersByEmail,
  verifyPassword
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: unknown;
      email?: unknown;
      login?: unknown;
      password?: unknown;
    };
    // Prefer explicit login/username; fall back to email if client sends that alone.
    const identifier = cleanAuthInput(body.login ?? body.username ?? body.email);
    const password = cleanAuthInput(body.password);

    let user = null;
    if (identifier.includes("@")) {
      const emailMatches = await findUsersByEmail(identifier);
      if (emailMatches.length > 1) {
        return NextResponse.json(
          {
            error:
              "Email trùng nhiều tài khoản. Hãy đăng nhập bằng tên tài khoản, hoặc liên hệ hỗ trợ."
          },
          { status: 409 }
        );
      }
      // Email hit, else username that contains `@` (legacy accounts).
      user = emailMatches[0] ?? (await findUserByUsername(identifier));
    } else {
      user = await findUserByUsername(identifier);
    }

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { error: "Tên tài khoản / email hoặc mật khẩu không đúng." },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: Boolean(user.email_verified_at),
        isAdmin: user.role === "admin"
      }
    });
  } catch (error) {
    console.error("login failed:", error);
    return NextResponse.json({ error: "Không đăng nhập được." }, { status: 500 });
  }
}
