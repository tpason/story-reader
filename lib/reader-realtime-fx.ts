import { prefersReducedMotion } from "@/lib/browser";
import { readReaderPerformanceMode } from "@/lib/reader-performance-mode";

/** Stored preference — `auto` resolves from device constraints. */
export type ReaderRealtimeFxPreference = "auto" | "full" | "subtle" | "off";
/** Effective mode applied to CSS / shimmer / toast. */
export type ReaderRealtimeFxMode = "full" | "subtle" | "off";

export const READER_REALTIME_FX_KEY = "reader:realtime-fx";
export const READER_REALTIME_FX_EVENT = "reader:realtime-fx-change";

export function readReaderRealtimeFxPreference(): ReaderRealtimeFxPreference {
  if (typeof window === "undefined") return "auto";
  const value = window.localStorage.getItem(READER_REALTIME_FX_KEY);
  if (value === "subtle" || value === "off" || value === "full" || value === "auto") return value;
  return "auto";
}

function isConstrainedDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (nav.connection?.saveData === true) return true;
  if (nav.connection?.effectiveType === "2g" || nav.connection?.effectiveType === "slow-2g") return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return true;
  if (window.matchMedia("(max-width: 839px)").matches) return true;
  return false;
}

/** Resolve stored preference → effective shimmer/toast intensity. */
export function resolveReaderRealtimeFx(
  preference: ReaderRealtimeFxPreference = readReaderRealtimeFxPreference(),
): ReaderRealtimeFxMode {
  if (preference !== "auto") return preference;
  if (prefersReducedMotion()) return "off";
  if (readReaderPerformanceMode() === "battery_saver") return "subtle";
  if (isConstrainedDevice()) return "subtle";
  return "full";
}

/** @deprecated Prefer resolveReaderRealtimeFx — kept as alias for call sites. */
export function readReaderRealtimeFx(): ReaderRealtimeFxMode {
  return resolveReaderRealtimeFx();
}

export function syncReaderRealtimeFxAttr() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-reader-realtime-fx", resolveReaderRealtimeFx());
}

export function writeReaderRealtimeFx(mode: ReaderRealtimeFxPreference) {
  window.localStorage.setItem(READER_REALTIME_FX_KEY, mode);
  syncReaderRealtimeFxAttr();
  window.dispatchEvent(new Event(READER_REALTIME_FX_EVENT));
}

export function isRealtimeShimmerEnabled(mode: ReaderRealtimeFxMode = resolveReaderRealtimeFx()) {
  return mode !== "off";
}

export function readerRealtimeFxPreferenceLabel(preference: ReaderRealtimeFxPreference) {
  if (preference === "auto") return "Tự động";
  if (preference === "subtle") return "Nhẹ";
  if (preference === "off") return "Tắt";
  return "Đầy đủ";
}
