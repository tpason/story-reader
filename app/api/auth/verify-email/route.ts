import { NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/mail/send";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(new URL("/account?verify=missing", request.url));
  }

  try {
    const user = await verifyEmailWithToken(token);
    if (!user?.email) {
      return NextResponse.redirect(new URL("/account?verify=invalid", request.url));
    }

    await sendWelcomeEmail({ to: user.email, username: user.username }).catch(() => undefined);
    return NextResponse.redirect(new URL("/account?verify=success", request.url));
  } catch (error) {
    console.error("verify-email failed:", error);
    return NextResponse.redirect(new URL("/account?verify=error", request.url));
  }
}
