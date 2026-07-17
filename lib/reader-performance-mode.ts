export type ReaderPerformanceMode = "balanced" | "battery_saver" | "full_effects";

export const READER_PERFORMANCE_MODE_KEY = "reader:performance-mode";

export function readReaderPerformanceMode(): ReaderPerformanceMode {
  if (typeof window === "undefined") return "balanced";
  const raw = window.localStorage.getItem(READER_PERFORMANCE_MODE_KEY);
  if (raw === "battery_saver" || raw === "full_effects" || raw === "balanced") return raw;
  return "balanced";
}

/** Sync mode → <html data-xi-perf> so CSS can honor battery_saver (not only WebGL gates). */
export function applyReaderPerformanceModeAttr(mode: ReaderPerformanceMode = readReaderPerformanceMode()) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "battery_saver") {
    root.setAttribute("data-xi-perf", "saver");
  } else if (mode === "full_effects") {
    root.setAttribute("data-xi-perf", "full");
  } else {
    root.setAttribute("data-xi-perf", "balanced");
  }
}

export function writeReaderPerformanceMode(mode: ReaderPerformanceMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_PERFORMANCE_MODE_KEY, mode);
  applyReaderPerformanceModeAttr(mode);
}

export function readerPerformanceModeLabel(mode: ReaderPerformanceMode) {
  if (mode === "battery_saver") return "Tiết kiệm pin";
  if (mode === "full_effects") return "Hiệu ứng đầy đủ";
  return "Cân bằng";
}
