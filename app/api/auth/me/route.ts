import { NextResponse } from "next/server";
import { getCurrentUser, touchCurrentSessionIfNeeded } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  // Sliding renew must run in a Route Handler (cookie write), not inside cached getCurrentUser.
  await touchCurrentSessionIfNeeded();
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
