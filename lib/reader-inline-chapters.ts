import type { ChapterSummary } from "@/lib/types";

export const MAX_READER_INLINE_APPEND = 3;

/** Minimal chapter row for prev/next links from inline blocks (flags are not loaded). */
export function inlineBlockToChapterSummary(
  block: ReaderInlineChapterBlock,
  storyId: string
): ChapterSummary {
  return {
    id: block.chapterId,
    storyId,
    chapterNumber: block.chapterNumber,
    title: block.title,
    isDownloaded: false,
    isPolished: false,
    isTranslated: false,
    isAudioGenerated: false,
    hasDbText: true,
    textSource: null,
    hasAudio: false,
    updatedAt: null
  };
}

/** Visible chapter from comments sidebar id (updates when scroll crosses inline boundaries). */
export function resolveVisibleChapterNumber(
  commentsChapterId: string,
  primaryChapterId: string,
  primaryChapterNumber: number,
  inlineChapters: ReaderInlineChapterBlock[]
): number {
  if (commentsChapterId === primaryChapterId) return primaryChapterNumber;
  const inline = inlineChapters.find((block) => block.chapterId === commentsChapterId);
  return inline?.chapterNumber ?? primaryChapterNumber;
}

/** Mirror of {@link resolveTailNextChapter} for previous — respects inline append + visible chapter. */
export function resolvePreviousChapter(
  inlineChapters: ReaderInlineChapterBlock[],
  primaryChapter: ChapterSummary,
  primaryPreviousChapter: ChapterSummary | null,
  visibleChapterNumber: number
): ChapterSummary | null {
  if (visibleChapterNumber === primaryChapter.chapterNumber) {
    return primaryPreviousChapter;
  }

  const inlineIndex = inlineChapters.findIndex((block) => block.chapterNumber === visibleChapterNumber);
  if (inlineIndex >= 0) {
    if (inlineIndex === 0) return primaryChapter;
    return inlineBlockToChapterSummary(inlineChapters[inlineIndex - 1], primaryChapter.storyId);
  }

  if (visibleChapterNumber > primaryChapter.chapterNumber) {
    return primaryChapter;
  }

  return primaryPreviousChapter;
}

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
