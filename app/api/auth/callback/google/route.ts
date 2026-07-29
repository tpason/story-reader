import { NextResponse } from "next/server";
import { completeGoogleOAuth, sanitizeReturnTo } from "@/lib/auth-google";
import { getSiteUrl } from "@/lib/seo-text";

export const dynamic = "force-dynamic";

function redirectWithError(error: string, returnTo?: string) {
  const target = returnTo?.startsWith("/login")
    ? returnTo
    : `/login?error=${encodeURIComponent(error)}`;
  return NextResponse.redirect(new URL(sanitizeReturnTo(target), getSiteUrl()));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await completeGoogleOAuth({
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state")
  });

  if (!result.ok) {
    if (result.error === "google_link_required" && result.returnTo) {
      return NextResponse.redirect(new URL(result.returnTo, getSiteUrl()));
    }
    return redirectWithError(result.error, result.returnTo);
  }

  return NextResponse.redirect(new URL(sanitizeReturnTo(result.returnTo), getSiteUrl()));
}
