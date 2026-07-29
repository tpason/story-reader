import { NextResponse } from "next/server";
import { beginGoogleOAuth, isGoogleAuthConfigured, sanitizeReturnTo } from "@/lib/auth-google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_config", request.url));
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
      return NextResponse.redirect(new URL("/login?error=google_link_auth", request.url));
    }
    console.error("google oauth start failed:", error);
    return NextResponse.redirect(new URL("/login?error=google_start", request.url));
  }
}
