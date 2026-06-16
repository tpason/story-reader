import { NextResponse } from "next/server";
import { VAPID_PUBLIC } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!VAPID_PUBLIC) return NextResponse.json({ key: null });
  return NextResponse.json({ key: VAPID_PUBLIC });
}
