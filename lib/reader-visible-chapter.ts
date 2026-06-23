export const READER_PARAGRAPH_POSITION_PREFIX = "reader:paragraph-position";

export type ReaderVisibleChapter = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  paragraphIndex: number;
};

export function readerParagraphPositionKey(storyId: string, chapterNumber: number) {
  return `${READER_PARAGRAPH_POSITION_PREFIX}:${storyId}:${chapterNumber}`;
}

export function readerScrollPositionKey(storyId: string, chapterNumber: number) {
  return `reader:${storyId}:${chapterNumber}`;
}

export function readVisibleChapterFromParagraph(
  node: HTMLElement,
  fallback: ReaderVisibleChapter
): ReaderVisibleChapter | null {
  const paragraphIndex = Number(node.dataset.paragraphIndex);
  const chapterNumber = Number(node.dataset.chapterNumber);
  const chapterId = node.dataset.chapterId;
  if (!Number.isInteger(paragraphIndex) || !Number.isInteger(chapterNumber) || !chapterId) return null;

  return {
    chapterId,
    chapterNumber,
    chapterTitle: node.dataset.chapterTitle ?? fallback.chapterTitle,
    paragraphIndex
  };
}

export function pickBestVisibleParagraphEntry(entries: IntersectionObserverEntry[]) {
  return entries
    .filter((entry) => entry.isIntersecting)
    .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0] ?? null;
}
