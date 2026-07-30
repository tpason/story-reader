import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/mail/preferences";
import { absoluteSiteUrl } from "@/lib/seo-text";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(absoluteSiteUrl("/account?unsubscribe=missing"));
  }

  const userId = await unsubscribeByToken(token);
  if (!userId) {
    return NextResponse.redirect(absoluteSiteUrl("/account?unsubscribe=invalid"));
  }

  return NextResponse.redirect(absoluteSiteUrl("/account?unsubscribe=success"));
}
