import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireVerifiedEmail } from "@/lib/mail/gates";
import { getEmailPreferences, updateEmailPreferences } from "@/lib/mail/preferences";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const prefs = await getEmailPreferences(user.id);
  return NextResponse.json({
    email: user.email,
    emailVerified: user.emailVerified,
    preferences: prefs
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }
  if (!requireVerifiedEmail(user)) {
    return NextResponse.json({ error: "Cần xác thực email trước khi bật bản tin." }, { status: 403 });
  }

  const body = (await request.json()) as {
    weeklyDigest?: unknown;
    newStoriesDigest?: unknown;
  };

  const weeklyDigest = typeof body.weeklyDigest === "boolean" ? body.weeklyDigest : undefined;
  const newStoriesDigest = typeof body.newStoriesDigest === "boolean" ? body.newStoriesDigest : undefined;

  const preferences = await updateEmailPreferences(user.id, { weeklyDigest, newStoriesDigest });
  return NextResponse.json({ preferences });
}
