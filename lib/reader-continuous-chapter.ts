export const READER_CONTINUOUS_CHAPTER_KEY = "reader:continuous-chapter";

export function readReaderContinuousChapter(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(READER_CONTINUOUS_CHAPTER_KEY);
  return raw === "1" || raw === "true";
}

export function writeReaderContinuousChapter(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_CONTINUOUS_CHAPTER_KEY, enabled ? "1" : "0");
}
