import { NextResponse } from "next/server";
import { verifyDigestCronToken } from "@/lib/mail/cron-auth";
import { runWeeklyDigest } from "@/lib/mail/weekly-digest";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.MAIL_DIGEST_CRON_TOKEN?.trim()) {
    return NextResponse.json({ error: "Digest cron not configured." }, { status: 503 });
  }
  if (!verifyDigestCronToken(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runWeeklyDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("weekly-digest failed:", error);
    return NextResponse.json({ error: "Digest job failed." }, { status: 500 });
  }
}
