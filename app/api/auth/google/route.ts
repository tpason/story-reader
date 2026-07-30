import { NextResponse } from "next/server";
import { beginGoogleOAuth, isGoogleAuthConfigured, sanitizeReturnTo } from "@/lib/auth-google";
import { absoluteSiteUrl } from "@/lib/seo-text";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(absoluteSiteUrl("/login?error=google_config"));
  }

  const url = new URL(request.url);
  const intent = url.searchParams.get("intent") === "link" ? "link" : "login";
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));

  try {
    const authorizeUrl = await beginGoogleOAuth({ returnTo, intent });
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("authenticated")) {
      return NextResponse.redirect(absoluteSiteUrl("/login?error=google_link_auth"));
    }
    console.error("google oauth start failed:", error);
    return NextResponse.redirect(absoluteSiteUrl("/login?error=google_start"));
  }
}
