export type ReaderResumeHint = {
  paragraphIndex: number | null;
  progressPercent: number;
};

export function resumeDismissStorageKey(storyId: string, chapterNumber: number) {
  return `reader:resume-dismissed:${storyId}:${chapterNumber}`;
}

export function isResumeDismissed(storyId: string, chapterNumber: number) {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(resumeDismissStorageKey(storyId, chapterNumber)) === "1";
}

export function dismissResumeHint(storyId: string, chapterNumber: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(resumeDismissStorageKey(storyId, chapterNumber), "1");
}

export function shouldOfferResumeHint(
  storyId: string,
  chapterNumber: number,
  progressPercent: number,
  paragraphIndex: number | null
) {
  if (isResumeDismissed(storyId, chapterNumber)) return false;
  if (paragraphIndex != null && paragraphIndex > 0) return true;
  return progressPercent >= 8;
}

const PARAGRAPH_POSITION_PREFIX = "reader:paragraph-position";
const BOOKMARK_SCROLL_PREFIX = "reader:bookmark-scroll";

export function readerForceTopKey(storyId: string, chapterNumber: number) {
  return `reader:force-top:${storyId}:${chapterNumber}`;
}

/** TOC / intentional "start this chapter" — restore lands at top. */
export function markReaderChapterStart(storyId: string, chapterNumber: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(readerForceTopKey(storyId, chapterNumber), "true");
}

/** Swipe/prev back — clear force-top so saved paragraph/scroll can restore. */
export function clearReaderChapterForceTop(storyId: string, chapterNumber: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(readerForceTopKey(storyId, chapterNumber));
}

/** Restore reading position when jumping from library / resume bar. */
export function writeResumeNavigationTarget(
  storyId: string,
  chapterNumber: number,
  target: { scrollPosition?: number; paragraphIndex?: number | null }
) {
  if (typeof window === "undefined") return;
  clearReaderChapterForceTop(storyId, chapterNumber);
  if (target.paragraphIndex != null && target.paragraphIndex > 0) {
    window.localStorage.setItem(`${PARAGRAPH_POSITION_PREFIX}:${storyId}:${chapterNumber}`, String(target.paragraphIndex));
    window.sessionStorage.removeItem(`${BOOKMARK_SCROLL_PREFIX}:${storyId}:${chapterNumber}`);
    return;
  }
  window.localStorage.removeItem(`${PARAGRAPH_POSITION_PREFIX}:${storyId}:${chapterNumber}`);
  if (target.scrollPosition != null && target.scrollPosition > 0) {
    window.sessionStorage.setItem(`${BOOKMARK_SCROLL_PREFIX}:${storyId}:${chapterNumber}`, String(Math.round(target.scrollPosition)));
  }
}

export type ReaderRestoreTarget =
  | { kind: "force-top" }
  | { kind: "scroll"; top: number }
  | { kind: "paragraph"; paragraphIndex: number }
  | { kind: "none" };

/**
 * Resolve where the reader should land after open/reload.
 * Priority: force-top → session bookmark scroll → paragraph → pixel scroll.
 */
export function resolveReaderRestoreTarget(input: {
  forceTop?: boolean;
  bookmarkScroll?: number | null;
  localParagraph?: number | null;
  historyParagraph?: number | null;
  localScroll?: number | null;
  historyScroll?: number | null;
  sameChapter?: boolean;
}): ReaderRestoreTarget {
  if (input.forceTop) return { kind: "force-top" };

  const bookmarkScroll = Number(input.bookmarkScroll);
  if (Number.isFinite(bookmarkScroll) && bookmarkScroll > 0) {
    return { kind: "scroll", top: Math.round(bookmarkScroll) };
  }

  const localParagraph = Number(input.localParagraph);
  if (Number.isInteger(localParagraph) && localParagraph > 0) {
    return { kind: "paragraph", paragraphIndex: localParagraph };
  }

  const historyParagraph = input.historyParagraph;
  if (input.sameChapter && historyParagraph != null && historyParagraph > 0) {
    return { kind: "paragraph", paragraphIndex: historyParagraph };
  }

  const localScroll = Number(input.localScroll);
  if (Number.isFinite(localScroll) && localScroll > 0) {
    return { kind: "scroll", top: Math.round(localScroll) };
  }

  const historyScroll = Number(input.historyScroll);
  if (input.sameChapter && Number.isFinite(historyScroll) && historyScroll > 0) {
    return { kind: "scroll", top: Math.round(historyScroll) };
  }

  return { kind: "none" };
}
