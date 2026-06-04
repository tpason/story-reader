import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatNovelContent, READER_CONTENT_FORMAT_VERSION } from "@/lib/formatNovelContent";

export const dynamic = "force-dynamic";

const PROJECT_ROOT_CANDIDATES = Array.from(new Set([process.cwd(), resolve(process.cwd(), "..")]));

type ChapterQualityRow = {
  id: string;
  title: string;
  raw_text_path: string | null;
  translated_text_path: string | null;
  polished_text_path: string | null;
  raw_text_content: string | null;
  translated_text_content: string | null;
  polished_text_content: string | null;
  reader_formatted_text_content: string | null;
  reader_formatted_content_version: number | null;
};

async function readProjectTextFile(path: string | null) {
  if (!path) return null;

  for (const projectRoot of PROJECT_ROOT_CANDIDATES) {
    const absolutePath = isAbsolute(path) ? resolve(path) : resolve(projectRoot, path);
    if (!absolutePath.startsWith(projectRoot)) continue;

    try {
      return await readFile(absolutePath, "utf8");
    } catch {
      continue;
    }
  }

  return null;
}

function sourceContent(row: ChapterQualityRow) {
  return row.polished_text_content ?? row.translated_text_content ?? row.raw_text_content ?? null;
}

function sourcePath(row: ChapterQualityRow) {
  return row.polished_text_path ?? row.translated_text_path ?? row.raw_text_path ?? null;
}

function qualityStats(rawContent: string, formattedParagraphs: string[]) {
  const rawLines = rawContent.replace(/\r\n?/g, "\n").split("\n");
  const shortLineCount = rawLines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && trimmed.length <= 42 && !/[.!?。！？…]"?$/u.test(trimmed);
  }).length;
  const danglingQuoteCount = rawLines.filter((line) => /^["']\s+\S/u.test(line.trim()) || /^["']$/u.test(line.trim())).length;
  const softWrapRatio = rawLines.length > 0 ? shortLineCount / rawLines.length : 0;

  return {
    rawLines: rawLines.length,
    formattedParagraphs: formattedParagraphs.length,
    shortLineCount,
    danglingQuoteCount,
    softWrapRatio: Math.round(softWrapRatio * 1000) / 1000
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ chapterId: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { chapterId } = await params;
  const rows = await query<ChapterQualityRow>(
    `
      SELECT id, title, raw_text_path, translated_text_path, polished_text_path,
        raw_text_content, translated_text_content, polished_text_content,
        reader_formatted_text_content, reader_formatted_content_version
      FROM chapters
      WHERE id = $1
      LIMIT 1
    `,
    [chapterId]
  );

  if (!rows[0]) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  const row = rows[0];
  const rawContent = sourceContent(row) ?? (await readProjectTextFile(sourcePath(row))) ?? "";
  const formattedParagraphs = formatNovelContent(rawContent, undefined, row.title);
  const cachedFormattedValid = row.reader_formatted_content_version === READER_CONTENT_FORMAT_VERSION;

  return NextResponse.json({
    chapterId: row.id,
    formatVersion: READER_CONTENT_FORMAT_VERSION,
    cachedFormattedValid,
    cachedParagraphs: cachedFormattedValid && row.reader_formatted_text_content ? row.reader_formatted_text_content.split(/\n{2,}/).filter(Boolean).length : 0,
    stats: qualityStats(rawContent, formattedParagraphs),
    preview: formattedParagraphs.slice(0, 8)
  });
}
