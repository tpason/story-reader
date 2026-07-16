import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/mail/preferences";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(new URL("/account?unsubscribe=missing", request.url));
  }

  const userId = await unsubscribeByToken(token);
  if (!userId) {
    return NextResponse.redirect(new URL("/account?unsubscribe=invalid", request.url));
  }

  return NextResponse.redirect(new URL("/account?unsubscribe=success", request.url));
}
