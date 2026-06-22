export type ReaderRealtimeFxMode = "full" | "subtle" | "off";

export const READER_REALTIME_FX_KEY = "reader:realtime-fx";
export const READER_REALTIME_FX_EVENT = "reader:realtime-fx-change";

export function readReaderRealtimeFx(): ReaderRealtimeFxMode {
  if (typeof window === "undefined") return "full";
  const value = window.localStorage.getItem(READER_REALTIME_FX_KEY);
  if (value === "subtle" || value === "off") return value;
  return "full";
}

export function syncReaderRealtimeFxAttr() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-reader-realtime-fx", readReaderRealtimeFx());
}

export function writeReaderRealtimeFx(mode: ReaderRealtimeFxMode) {
  window.localStorage.setItem(READER_REALTIME_FX_KEY, mode);
  document.documentElement.setAttribute("data-reader-realtime-fx", mode);
  window.dispatchEvent(new Event(READER_REALTIME_FX_EVENT));
}

export function isRealtimeShimmerEnabled(mode: ReaderRealtimeFxMode = readReaderRealtimeFx()) {
  return mode !== "off";
}
