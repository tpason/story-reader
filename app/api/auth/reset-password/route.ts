import { NextResponse } from "next/server";
import { cleanAuthInput, resetPasswordWithToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: unknown; password?: unknown };
    const token = cleanAuthInput(body.token);
    const password = cleanAuthInput(body.password);

    if (!token) {
      return NextResponse.json({ error: "Liên kết không hợp lệ." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu cần ít nhất 8 ký tự." }, { status: 400 });
    }

    const user = await resetPasswordWithToken(token, password);
    if (!user) {
      return NextResponse.json({ error: "Liên kết hết hạn hoặc đã dùng." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("reset-password failed:", error);
    return NextResponse.json({ error: "Không đặt lại được mật khẩu." }, { status: 500 });
  }
}
