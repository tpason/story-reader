import type { ReaderInlineChapterBlock } from "@/lib/reader-inline-chapters";

export const PROMOTE_PRIMARY_EXIT_RATIO = 0.15;

export function shouldAutoPromotePrimaryChapter(options: {
  continuousEnabled: boolean;
  primaryChapterNumber: number;
  visibleChapterNumber: number;
  inlineChapters: ReaderInlineChapterBlock[];
  primarySectionBottomPx: number;
  viewportHeight: number;
}): boolean {
  const { continuousEnabled, primaryChapterNumber, visibleChapterNumber, inlineChapters, primarySectionBottomPx, viewportHeight } =
    options;

  if (!continuousEnabled || inlineChapters.length === 0) return false;
  if (visibleChapterNumber <= primaryChapterNumber) return false;

  const firstInline = inlineChapters[0];
  if (!firstInline || visibleChapterNumber < firstInline.chapterNumber) return false;

  const primaryMostlyScrolledPast = primarySectionBottomPx < viewportHeight * PROMOTE_PRIMARY_EXIT_RATIO;
  return primaryMostlyScrolledPast;
}

export function inlineBlocksAfterHeadPromotion(inlineChapters: ReaderInlineChapterBlock[]) {
  return inlineChapters.slice(1);
}
