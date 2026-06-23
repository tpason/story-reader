export const READER_AUDIO_READ_ALONG_KEY = "reader:audio-read-along";

export function readReaderAudioReadAlong(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(READER_AUDIO_READ_ALONG_KEY);
  if (raw == null) return true;
  return raw === "1" || raw === "true";
}

export function writeReaderAudioReadAlong(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_AUDIO_READ_ALONG_KEY, enabled ? "1" : "0");
}
