import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseImportFiles, parseImportText, type ParsedImportChapter } from "@/lib/author-import";
import { importAuthorChapters } from "@/lib/author-stories";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ storyId: string }> };

const MAX_TOTAL_CHARS = 5_000_000;

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Cần đăng nhập động phủ" }, { status: 401 });
  const { storyId } = await params;

  const body = (await request.json().catch(() => ({}))) as {
    text?: unknown;
    files?: unknown;
    dryRun?: unknown;
    cleanPaste?: unknown;
    publishStatus?: unknown;
    replaceDrafts?: unknown;
  };

  const clean = body.cleanPaste === true;
  let chapters: ParsedImportChapter[] = [];

  try {
    if (Array.isArray(body.files) && body.files.length > 0) {
      const files = body.files
        .map((f) => {
          if (!f || typeof f !== "object") return null;
          const rec = f as { name?: unknown; text?: unknown };
          if (typeof rec.name !== "string" || typeof rec.text !== "string") return null;
          return { name: rec.name, text: rec.text };
        })
        .filter((f): f is { name: string; text: string } => Boolean(f));
      chapters = parseImportFiles(files, { cleanPaste: clean });
    } else if (typeof body.text === "string") {
      chapters = parseImportText(body.text, { cleanPaste: clean });
    } else {
      return NextResponse.json({ error: "Cần text hoặc files để import" }, { status: 400 });
    }

    const totalChars = chapters.reduce((sum, c) => sum + c.content.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: "File quá lớn (tối đa ~5MB text)" }, { status: 400 });
    }

    if (body.dryRun === true) {
      return NextResponse.json({
        dryRun: true,
        chapters: chapters.map((c) => ({
          title: c.title,
          wordCount: c.wordCount,
          charCount: c.content.length,
          preview: c.content.slice(0, 180)
        }))
      });
    }

    const created = await importAuthorChapters(storyId, user.id, chapters, {
      publishStatus: body.publishStatus as "draft" | "published" | undefined,
      replaceDrafts: body.replaceDrafts === true
    });
    return NextResponse.json({ chapters: created }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import thất bại" },
      { status }
    );
  }
}
