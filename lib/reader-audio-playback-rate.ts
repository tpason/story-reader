export const READER_AUDIO_PLAYBACK_RATE_KEY = "reader:audio-playback-rate";

export const READER_AUDIO_PLAYBACK_RATES = [0.85, 1, 1.15, 1.3] as const;

export type ReaderAudioPlaybackRate = (typeof READER_AUDIO_PLAYBACK_RATES)[number];

export function readReaderAudioPlaybackRate(): ReaderAudioPlaybackRate {
  if (typeof window === "undefined") return 1;
  const raw = window.localStorage.getItem(READER_AUDIO_PLAYBACK_RATE_KEY);
  const parsed = raw ? Number(raw) : 1;
  return READER_AUDIO_PLAYBACK_RATES.includes(parsed as ReaderAudioPlaybackRate)
    ? (parsed as ReaderAudioPlaybackRate)
    : 1;
}

export function writeReaderAudioPlaybackRate(rate: number) {
  if (typeof window === "undefined") return;
  const normalized = READER_AUDIO_PLAYBACK_RATES.includes(rate as ReaderAudioPlaybackRate)
    ? rate
    : 1;
  window.localStorage.setItem(READER_AUDIO_PLAYBACK_RATE_KEY, String(normalized));
}
