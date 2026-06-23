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

/** Restore reading position when jumping from library / resume bar. */
export function writeResumeNavigationTarget(
  storyId: string,
  chapterNumber: number,
  target: { scrollPosition?: number; paragraphIndex?: number | null }
) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(`reader:force-top:${storyId}:${chapterNumber}`);
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
