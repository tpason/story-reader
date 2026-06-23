export const READER_AUDIO_AUTO_NEXT_KEY = "reader:audio-auto-next-chapter";

export function readReaderAudioAutoNext(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(READER_AUDIO_AUTO_NEXT_KEY);
  return raw === "1" || raw === "true";
}

export function writeReaderAudioAutoNext(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_AUDIO_AUTO_NEXT_KEY, enabled ? "1" : "0");
}
