import { NextRequest, NextResponse } from "next/server";
import { listStoriesCursor } from "@/lib/stories";

export const dynamic = "force-dynamic";

function boolParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function numberParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function sortParam(value: string | null) {
  if (value === "chapters" || value === "hot" || value === "title" || value === "updated") return value;
  return undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const data = await listStoriesCursor({
      cursor: params.get("cursor"),
      limit: Number(params.get("limit") ?? params.get("pageSize") ?? 24),
      category: params.get("category") ?? undefined,
      completed: boolParam(params.get("completed")),
      hot: params.get("hot") === "true",
      queryText: params.get("q") ?? undefined,
      author: params.get("author") ?? undefined,
      minChapters: numberParam(params.get("minChapters")) ?? 1,
      maxChapters: numberParam(params.get("maxChapters")),
      hasPolished: params.get("hasPolished") === "true",
      hasAudio: params.get("hasAudio") === "true",
      sort: sortParam(params.get("sort"))
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load stories", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
