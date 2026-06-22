export type ReaderPerformanceMode = "balanced" | "battery_saver" | "full_effects";

export const READER_PERFORMANCE_MODE_KEY = "reader:performance-mode";

export function readReaderPerformanceMode(): ReaderPerformanceMode {
  if (typeof window === "undefined") return "balanced";
  const raw = window.localStorage.getItem(READER_PERFORMANCE_MODE_KEY);
  if (raw === "battery_saver" || raw === "full_effects" || raw === "balanced") return raw;
  return "balanced";
}

export function writeReaderPerformanceMode(mode: ReaderPerformanceMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_PERFORMANCE_MODE_KEY, mode);
}

export function readerPerformanceModeLabel(mode: ReaderPerformanceMode) {
  if (mode === "battery_saver") return "Tiết kiệm pin";
  if (mode === "full_effects") return "Hiệu ứng đầy đủ";
  return "Cân bằng";
}
