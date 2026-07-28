import { NextResponse } from "next/server";
import { getActiveSiteAnnouncement } from "@/lib/site-announcements";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const announcement = await getActiveSiteAnnouncement();
    const response = NextResponse.json({ announcement });
    response.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    // Table may not exist yet before migration — fail soft for public shell.
    console.warn(
      "[announcements] active fetch failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ announcement: null });
  }
}
