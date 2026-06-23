export const READER_COMMENTS_SPLIT_KEY = "reader:comments-split";

export function readReaderCommentsSplit(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(READER_COMMENTS_SPLIT_KEY);
  return raw === "1" || raw === "true";
}

export function writeReaderCommentsSplit(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_COMMENTS_SPLIT_KEY, enabled ? "1" : "0");
}
