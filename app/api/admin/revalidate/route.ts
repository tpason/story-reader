import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PATHS = ["/", "/categories", "/discover", "/rankings", "/updates", "/dao-luan"] as const;

function authorized(request: Request): boolean {
  const token = process.env.READER_REALTIME_TOKEN?.trim();
  if (!token) return false;
  const header = request.headers.get("authorization")?.trim() ?? "";
  if (header === `Bearer ${token}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("token") === token;
}

/** Post-deploy hook: purge ISR shells baked without DB so live Postgres fills them. */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  for (const path of PATHS) {
    revalidatePath(path);
  }
  return NextResponse.json({ ok: true, revalidated: PATHS });
}
