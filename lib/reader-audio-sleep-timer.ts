export const READER_AUDIO_SLEEP_TIMER_PRESET_KEY = "reader:audio-sleep-timer-preset";
export const READER_AUDIO_SLEEP_TIMER_ENDS_AT_KEY = "reader:audio-sleep-timer-ends-at";

export const READER_AUDIO_SLEEP_TIMER_PRESETS = [15, 30, 45, 60] as const;

export type ReaderAudioSleepTimerPreset = (typeof READER_AUDIO_SLEEP_TIMER_PRESETS)[number];

export function isReaderAudioSleepTimerPreset(value: number): value is ReaderAudioSleepTimerPreset {
  return READER_AUDIO_SLEEP_TIMER_PRESETS.includes(value as ReaderAudioSleepTimerPreset);
}

export function readReaderAudioSleepTimerPreset(): ReaderAudioSleepTimerPreset | 0 {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(READER_AUDIO_SLEEP_TIMER_PRESET_KEY);
  const parsed = raw ? Number(raw) : 0;
  return isReaderAudioSleepTimerPreset(parsed) ? parsed : 0;
}

export function writeReaderAudioSleepTimerPreset(minutes: ReaderAudioSleepTimerPreset | 0) {
  if (typeof window === "undefined") return;
  if (minutes === 0) {
    window.localStorage.removeItem(READER_AUDIO_SLEEP_TIMER_PRESET_KEY);
    return;
  }
  window.localStorage.setItem(READER_AUDIO_SLEEP_TIMER_PRESET_KEY, String(minutes));
}

export function readReaderAudioSleepTimerEndsAt(now = Date.now()): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(READER_AUDIO_SLEEP_TIMER_ENDS_AT_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= now) {
    if (raw) window.localStorage.removeItem(READER_AUDIO_SLEEP_TIMER_ENDS_AT_KEY);
    return null;
  }
  return parsed;
}

export function writeReaderAudioSleepTimerEndsAt(endsAtMs: number | null) {
  if (typeof window === "undefined") return;
  if (endsAtMs == null) {
    window.localStorage.removeItem(READER_AUDIO_SLEEP_TIMER_ENDS_AT_KEY);
    return;
  }
  window.localStorage.setItem(READER_AUDIO_SLEEP_TIMER_ENDS_AT_KEY, String(endsAtMs));
}

export function clearReaderAudioSleepTimer() {
  writeReaderAudioSleepTimerPreset(0);
  writeReaderAudioSleepTimerEndsAt(null);
}

export function scheduleReaderAudioSleepTimer(minutes: ReaderAudioSleepTimerPreset, now = Date.now()) {
  const endsAt = now + minutes * 60_000;
  writeReaderAudioSleepTimerPreset(minutes);
  writeReaderAudioSleepTimerEndsAt(endsAt);
  return endsAt;
}
