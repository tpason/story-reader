import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function cleanOptionalText(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    storyId?: unknown;
    chapterId?: unknown;
    storyTitle?: unknown;
    author?: unknown;
    description?: unknown;
    chapterTitle?: unknown;
    content?: unknown;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const chapterId = typeof body.chapterId === "string" ? body.chapterId : "";
  const storyTitle = cleanOptionalText(body.storyTitle, 360);
  const author = cleanOptionalText(body.author, 240);
  const description = cleanOptionalText(body.description, 6000);
  const chapterTitle = cleanOptionalText(body.chapterTitle, 360);
  const content = typeof body.content === "string" ? body.content.trim() : undefined;

  if (!storyId && !chapterId) {
    return NextResponse.json({ error: "storyId or chapterId is required" }, { status: 400 });
  }

  if (storyId && (storyTitle !== undefined || author !== undefined || description !== undefined)) {
    await query(
      `
        UPDATE stories
        SET display_title = COALESCE($2, display_title),
            author = COALESCE($3, author),
            description = COALESCE($4, description),
            updated_at = now()
        WHERE id = $1
      `,
      [storyId, storyTitle, author, description]
    );
  }

  if (chapterId && chapterTitle !== undefined) {
    await query(
      `
        UPDATE chapters
        SET title = COALESCE($2, title),
            updated_at = now()
        WHERE id = $1
      `,
      [chapterId, chapterTitle]
    );
  }

  if (chapterId && content !== undefined) {
    await query(
      `
        UPDATE chapters
        SET polished_text_content = $2,
            is_polished = TRUE,
            polished_at = now(),
            reader_formatted_text_content = NULL,
            reader_formatted_source_hash = NULL,
            reader_formatted_content_version = NULL,
            updated_at = now()
        WHERE id = $1
      `,
      [chapterId, content]
    );
  }

  return NextResponse.json({ ok: true });
}
