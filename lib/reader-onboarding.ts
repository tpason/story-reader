export const READER_MOBILE_PRESET_BOOTSTRAP_KEY = "reader:mobile-preset-bootstrap";
export const READER_SWIPE_HINT_PREFIX = "reader:swipe-hint:";
export const READER_SKILL_EFFECTS_KEY = "reader:skill-effects-enabled";

export const READER_SWIPE_HINT_MESSAGE = "Vuốt trái/phải để đổi chương";
export const READER_SWIPE_HINT_DURATION_MS = 4200;

export function swipeHintStorageKey(storyId: string) {
  return `${READER_SWIPE_HINT_PREFIX}${storyId}`;
}

export function shouldShowSwipeHint(storyId: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(swipeHintStorageKey(storyId)) !== "1";
}

export function markSwipeHintShown(storyId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(swipeHintStorageKey(storyId), "1");
}

export function wasMobilePresetBootstrapped() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(READER_MOBILE_PRESET_BOOTSTRAP_KEY) === "1";
}

export function markMobilePresetBootstrapped() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_MOBILE_PRESET_BOOTSTRAP_KEY, "1");
}

export function readReaderSkillEffectsEnabled() {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(READER_SKILL_EFFECTS_KEY);
  return raw === "1" || raw === "true";
}

export function writeReaderSkillEffectsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_SKILL_EFFECTS_KEY, enabled ? "1" : "0");
}

export type ReaderSheetTab = "read" | "settings" | "offline";
const READER_SHEET_TAB_KEY = "reader:sheet-tab";

export function readReaderSheetTab(): ReaderSheetTab {
  if (typeof window === "undefined") return "read";
  const saved = window.sessionStorage.getItem(READER_SHEET_TAB_KEY);
  return saved === "settings" || saved === "offline" ? saved : "read";
}

export function writeReaderSheetTab(tab: ReaderSheetTab) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(READER_SHEET_TAB_KEY, tab);
}

export const READER_FOCUS_MODE_DEFAULT_KEY = "reader:focus-mode-default";

export function readReaderFocusModeDefault() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(READER_FOCUS_MODE_DEFAULT_KEY) === "1";
}

export function writeReaderFocusModeDefault(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_FOCUS_MODE_DEFAULT_KEY, enabled ? "1" : "0");
}
