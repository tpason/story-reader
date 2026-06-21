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
