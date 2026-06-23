import type { ContentLayer } from "@/lib/reader-content-layers";
import type { ReaderFetchOptions } from "@/lib/types";

export type BilingualDisplayMode = "single" | "interleaved" | "secondary_hidden";

export type ReaderBilingualPrefs = {
  enabled: boolean;
  primaryLayer: ContentLayer;
  secondaryLayer: ContentLayer;
  displayMode: BilingualDisplayMode;
  secondaryVisible: boolean;
  /** Soft jade highlight on the paragraph in view while scrolling (bilingual mode). */
  scrollHighlight: boolean;
};

export const READER_BILINGUAL_PREFS_KEY = "reader:bilingual-prefs";

export const DEFAULT_BILINGUAL_PREFS: ReaderBilingualPrefs = {
  enabled: false,
  primaryLayer: "raw",
  secondaryLayer: "polished",
  displayMode: "interleaved",
  secondaryVisible: true,
  scrollHighlight: true
};

export function readReaderBilingualPrefs(): ReaderBilingualPrefs {
  if (typeof window === "undefined") return DEFAULT_BILINGUAL_PREFS;
  try {
    const raw = window.localStorage.getItem(READER_BILINGUAL_PREFS_KEY);
    if (!raw) return DEFAULT_BILINGUAL_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReaderBilingualPrefs>;
    return {
      enabled: parsed.enabled === true,
      primaryLayer: parsed.primaryLayer === "raw" || parsed.primaryLayer === "translated" || parsed.primaryLayer === "polished" ? parsed.primaryLayer : "raw",
      secondaryLayer:
        parsed.secondaryLayer === "raw" || parsed.secondaryLayer === "translated" || parsed.secondaryLayer === "polished"
          ? parsed.secondaryLayer
          : "polished",
      displayMode:
        parsed.displayMode === "interleaved" || parsed.displayMode === "secondary_hidden" || parsed.displayMode === "single"
          ? parsed.displayMode
          : "interleaved",
      secondaryVisible: parsed.secondaryVisible !== false,
      scrollHighlight: parsed.scrollHighlight !== false
    };
  } catch {
    return DEFAULT_BILINGUAL_PREFS;
  }
}

export function writeReaderBilingualPrefs(prefs: ReaderBilingualPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_BILINGUAL_PREFS_KEY, JSON.stringify(prefs));
}

export function learnEnglishPreset(): ReaderBilingualPrefs {
  return {
    enabled: true,
    primaryLayer: "raw",
    secondaryLayer: "polished",
    displayMode: "interleaved",
    secondaryVisible: true,
    scrollHighlight: true
  };
}

export function bilingualFetchOptions(prefs: ReaderBilingualPrefs): ReaderFetchOptions | undefined {
  if (!prefs.enabled) return undefined;
  return {
    primaryLayer: prefs.primaryLayer,
    secondaryLayer: prefs.secondaryLayer,
    displayMode: prefs.displayMode === "single" ? "interleaved" : prefs.displayMode
  };
}
