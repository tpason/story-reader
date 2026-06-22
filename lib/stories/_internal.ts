import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { READER_CONTENT_FORMAT_VERSION } from "@/lib/formatNovelContent";
import type {
  ChapterSummary,
  StoryDiscoveryItem,
  StorySummary
} from "@/lib/types";

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 80;
export const READER_CHAPTER_PAGE_SIZE = 80;
export const PROJECT_ROOT_CANDIDATES = Array.from(new Set([process.cwd(), resolve(process.cwd(), "..")]));

export type StoryRow = {
  id: string;
  title: string;
  original_title: string | null;
  author: string | null;
  category: string | null;
  status: string | null;
  description: string | null;
  cover_image_url: string | null;
  rank_name: string | null;
  rank_position: number | null;
  total_chapters: number;
  is_completed: boolean;
  source_code: string;
  primary_category_name: string | null;
  primary_category_slug: string | null;
  updated_at: Date;
};

export type StoryDiscoveryRow = StoryRow & {
  latest_chapter_number: number | null;
  latest_chapter_title: string | null;
  latest_activity_at: Date;
  polished_chapter_count: string;
};

export type ChapterRow = {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  is_downloaded: boolean;
  is_polished: boolean;
  is_translated: boolean;
  is_audio_generated: boolean;
  raw_text_path: string | null;
  translated_text_path: string | null;
  polished_text_path: string | null;
  raw_text_content?: string | null;
  translated_text_content?: string | null;
  polished_text_content?: string | null;
  reader_formatted_text_content?: string | null;
  reader_formatted_content_version?: number | null;
  has_audio: boolean;
  chapter_updated_at: Date | null;
};

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  story_count: string;
};

export function pageParams(page?: number, pageSize?: number) {
  const cleanPage = Math.max(1, Number.isFinite(page) ? Number(page) : 1);
  const cleanPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isFinite(pageSize) ? Number(pageSize) : DEFAULT_PAGE_SIZE));
  return {
    page: cleanPage,
    pageSize: cleanPageSize,
    offset: (cleanPage - 1) * cleanPageSize
  };
}

export function limitParams(limit?: number, fallback = DEFAULT_PAGE_SIZE) {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isFinite(limit) ? Number(limit) : fallback));
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string | null): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { offset?: unknown };
    return Math.max(0, typeof parsed.offset === "number" ? parsed.offset : 0);
  } catch {
    return 0;
  }
}

export function chapterPageCursor(chapterNumber: number, pageSize: number) {
  const cleanChapterNumber = Math.max(1, Number.isFinite(chapterNumber) ? Math.floor(chapterNumber) : 1);
  const cleanPageSize = Math.max(1, pageSize);
  return Math.floor((cleanChapterNumber - 1) / cleanPageSize) * cleanPageSize;
}

export function textSource(row: Pick<ChapterRow, "polished_text_path" | "translated_text_path" | "raw_text_path">) {
  if (row.polished_text_path) return "polished";
  if (row.translated_text_path) return "translated";
  if (row.raw_text_path) return "raw";
  return null;
}

export function contentSource(row: Pick<ChapterRow, "polished_text_content" | "translated_text_content" | "raw_text_content" | "polished_text_path" | "translated_text_path" | "raw_text_path">) {
  if (row.polished_text_content) return "polished";
  if (row.translated_text_content) return "translated";
  if (row.raw_text_content) return "raw";
  if (row.polished_text_path) return "polished";
  if (row.translated_text_path) return "translated";
  if (row.raw_text_path) return "raw";
  return null;
}

export function textContent(row: Pick<ChapterRow, "polished_text_content" | "translated_text_content" | "raw_text_content">) {
  return row.polished_text_content ?? row.translated_text_content ?? row.raw_text_content ?? null;
}

export function readerFormattedContent(row: Pick<ChapterRow, "reader_formatted_text_content" | "reader_formatted_content_version">) {
  if (row.reader_formatted_content_version !== READER_CONTENT_FORMAT_VERSION) return null;
  return row.reader_formatted_text_content ?? null;
}

export function textPath(row: Pick<ChapterRow, "polished_text_path" | "translated_text_path" | "raw_text_path">) {
  return row.polished_text_path ?? row.translated_text_path ?? row.raw_text_path ?? null;
}

export async function readProjectTextFile(path: string | null): Promise<string | null> {
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

export function mapStory(row: StoryRow): StorySummary {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title,
    author: row.author,
    category: row.category,
    status: row.status,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    rankName: row.rank_name,
    rankPosition: row.rank_position,
    totalChapters: row.total_chapters,
    isCompleted: row.is_completed,
    sourceCode: row.source_code,
    primaryCategoryName: row.primary_category_name,
    primaryCategorySlug: row.primary_category_slug ?? null,
    updatedAt: row.updated_at.toISOString()
  };
}

export function mapDiscoveryStory(row: StoryDiscoveryRow): StoryDiscoveryItem {
  return {
    ...mapStory(row),
    latestChapterNumber: row.latest_chapter_number,
    latestChapterTitle: row.latest_chapter_title,
    latestActivityAt: row.latest_activity_at.toISOString(),
    polishedChapterCount: Number(row.polished_chapter_count ?? 0)
  };
}

export function mapChapter(row: ChapterRow): ChapterSummary {
  return {
    id: row.id,
    storyId: row.story_id,
    chapterNumber: row.chapter_number,
    title: row.title,
    isDownloaded: row.is_downloaded,
    isPolished: row.is_polished,
    isTranslated: row.is_translated,
    isAudioGenerated: row.is_audio_generated,
    hasDbText: Boolean(textContent(row) ?? textPath(row)),
    textSource: contentSource(row),
    hasAudio: row.has_audio,
    updatedAt: row.chapter_updated_at?.toISOString() ?? null
  };
}

export function storyOrderSql(sort?: "updated" | "chapters" | "hot" | "title") {
  switch (sort) {
    case "chapters":
      return "s.total_chapters DESC, s.updated_at DESC, s.id ASC";
    case "hot":
      return "s.rank_position NULLS LAST, s.total_chapters DESC, s.updated_at DESC, s.id ASC";
    case "title":
      return "COALESCE(NULLIF(s.display_title, ''), s.title) ASC, s.id ASC";
    case "updated":
    default:
      return "s.updated_at DESC, s.created_at DESC, s.id ASC";
  }
}
