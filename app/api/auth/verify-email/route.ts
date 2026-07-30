import { NextResponse } from "next/server";
import { verifyEmailWithToken } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/mail/send";
import { absoluteSiteUrl } from "@/lib/seo-text";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(absoluteSiteUrl("/account?verify=missing"));
  }

  try {
    const user = await verifyEmailWithToken(token);
    if (!user?.email) {
      return NextResponse.redirect(absoluteSiteUrl("/account?verify=invalid"));
    }

    await sendWelcomeEmail({ to: user.email, username: user.username }).catch(() => undefined);
    return NextResponse.redirect(absoluteSiteUrl("/account?verify=success"));
  } catch (error) {
    console.error("verify-email failed:", error);
    return NextResponse.redirect(absoluteSiteUrl("/account?verify=error"));
  }
}
