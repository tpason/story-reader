import type { ChapterSummary } from "@/lib/types";

export const MAX_READER_INLINE_APPEND = 2;

export type ReaderInlineChapterBlock = {
  chapterId: string;
  chapterNumber: number;
  title: string;
  paragraphs: string[];
  nextChapter: ChapterSummary | null;
};

export function resolveTailNextChapter(
  inlineChapters: ReaderInlineChapterBlock[],
  primaryNextChapter: ChapterSummary | null
): ChapterSummary | null {
  if (inlineChapters.length > 0) {
    return inlineChapters[inlineChapters.length - 1]?.nextChapter ?? null;
  }
  return primaryNextChapter;
}

export function canAppendInlineChapter(inlineCount: number): boolean {
  return inlineCount < MAX_READER_INLINE_APPEND;
}
