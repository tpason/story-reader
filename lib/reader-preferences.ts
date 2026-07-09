export type ReaderTheme = "light" | "parchment" | "bamboo" | "ink-night" | "dark" | "oled";

export type ReaderThemeOption = {
  id: ReaderTheme;
  label: string;
  title: string;
};

export const READER_THEME_OPTIONS: ReaderThemeOption[] = [
  { id: "light", label: "Sáng", title: "Light" },
  { id: "parchment", label: "宣纸", title: "Xuan paper" },
  { id: "bamboo", label: "竹简", title: "Bamboo scroll" },
  { id: "ink-night", label: "墨夜", title: "Ink night" },
  { id: "dark", label: "Tối", title: "Dark" },
  { id: "oled", label: "OLED", title: "OLED" }
];
export type ReaderFontFamily = "literata" | "noto-serif" | "sora" | "merriweather" | "serif" | "sans";
export type ReaderLayoutMode = "scroll" | "page";

export type ReaderStyleConfig = {
  theme: ReaderTheme;
  fontSize: number;
  fontFamily: ReaderFontFamily;
  lineHeight: number;
  paragraphSpacing: number;
  contentWidth: number;
  layoutMode: ReaderLayoutMode;
  tapEdgeEnabled: boolean;
  skillEffectsEnabled: boolean;
};

export const READER_STYLE_STORAGE_KEY = "reader-style-config";
export const READER_FONT_SIZE_MIN = 16;
export const READER_FONT_SIZE_MAX = 32;
export const READER_LINE_HEIGHT_MIN = 1.55;
export const READER_LINE_HEIGHT_MAX = 2.15;
export const READER_PARAGRAPH_SPACING_MIN = 0.9;
export const READER_PARAGRAPH_SPACING_MAX = 1.8;
export const READER_CONTENT_WIDTH_MIN = 620;
export const READER_CONTENT_WIDTH_MAX = 860;

export const DEFAULT_READER_STYLE_CONFIG: ReaderStyleConfig = {
  theme: "parchment",
  fontSize: 19,
  fontFamily: "literata",
  lineHeight: 1.82,
  paragraphSpacing: 1.24,
  contentWidth: 720,
  layoutMode: "scroll",
  tapEdgeEnabled: true,
  skillEffectsEnabled: false
};

const DEFAULTS = DEFAULT_READER_STYLE_CONFIG;

function normalizeReaderTheme(value: unknown): ReaderTheme | null {
  if (value === "sepia") return "parchment";
  if (value === "light" || value === "parchment" || value === "bamboo" || value === "ink-night" || value === "dark" || value === "oled") {
    return value;
  }
  return null;
}

function isFontFamily(value: unknown): value is ReaderFontFamily {
  return value === "literata" || value === "noto-serif" || value === "sora" || value === "merriweather" || value === "serif" || value === "sans";
}

function isLayoutMode(value: unknown): value is ReaderLayoutMode {
  return value === "scroll" || value === "page";
}

export function sanitizeReaderStyleConfig(input: unknown): ReaderStyleConfig {
  const candidate = (input ?? {}) as Partial<ReaderStyleConfig>;
  const theme = normalizeReaderTheme(candidate.theme) ?? DEFAULTS.theme;
  const fontFamily = isFontFamily(candidate.fontFamily) ? candidate.fontFamily : DEFAULTS.fontFamily;
  const fontSize = typeof candidate.fontSize === "number" && Number.isFinite(candidate.fontSize) ? candidate.fontSize : DEFAULTS.fontSize;
  const clampedFontSize = Math.min(READER_FONT_SIZE_MAX, Math.max(READER_FONT_SIZE_MIN, Math.round(fontSize)));
  const lineHeight = typeof candidate.lineHeight === "number" && Number.isFinite(candidate.lineHeight) ? candidate.lineHeight : DEFAULTS.lineHeight;
  const paragraphSpacing = typeof candidate.paragraphSpacing === "number" && Number.isFinite(candidate.paragraphSpacing) ? candidate.paragraphSpacing : DEFAULTS.paragraphSpacing;
  const contentWidth = typeof candidate.contentWidth === "number" && Number.isFinite(candidate.contentWidth) ? candidate.contentWidth : DEFAULTS.contentWidth;
  const clampedLineHeight = Math.min(READER_LINE_HEIGHT_MAX, Math.max(READER_LINE_HEIGHT_MIN, Math.round(lineHeight * 100) / 100));
  const clampedParagraphSpacing = Math.min(READER_PARAGRAPH_SPACING_MAX, Math.max(READER_PARAGRAPH_SPACING_MIN, Math.round(paragraphSpacing * 100) / 100));
  const clampedContentWidth = Math.min(READER_CONTENT_WIDTH_MAX, Math.max(READER_CONTENT_WIDTH_MIN, Math.round(contentWidth / 20) * 20));
  const layoutMode = isLayoutMode(candidate.layoutMode) ? candidate.layoutMode : DEFAULTS.layoutMode;
  const tapEdgeEnabled = typeof candidate.tapEdgeEnabled === "boolean" ? candidate.tapEdgeEnabled : DEFAULTS.tapEdgeEnabled;
  const skillEffectsEnabled = typeof candidate.skillEffectsEnabled === "boolean" ? candidate.skillEffectsEnabled : DEFAULTS.skillEffectsEnabled;

  return {
    theme,
    fontSize: clampedFontSize,
    fontFamily,
    lineHeight: clampedLineHeight,
    paragraphSpacing: clampedParagraphSpacing,
    contentWidth: clampedContentWidth,
    layoutMode,
    tapEdgeEnabled,
    skillEffectsEnabled
  };
}

export function readReaderStyleConfig(): ReaderStyleConfig {
  if (typeof window === "undefined") return DEFAULTS;

  const raw = window.localStorage.getItem(READER_STYLE_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ReaderStyleConfig>;
      return sanitizeReaderStyleConfig({
        ...parsed,
        tapEdgeEnabled: typeof parsed.tapEdgeEnabled === "boolean" ? parsed.tapEdgeEnabled : readLegacyTapEdgeEnabled(),
        skillEffectsEnabled: typeof parsed.skillEffectsEnabled === "boolean" ? parsed.skillEffectsEnabled : readLegacySkillEffectsEnabled()
      });
    } catch {
      // fallthrough to legacy keys
    }
  }

  const legacyTheme = window.localStorage.getItem("reader-theme");
  const legacyFontSize = Number(window.localStorage.getItem("reader-font-size"));
  const legacyFontFamily = window.localStorage.getItem("reader-font-family");
  const legacyLineHeight = Number(window.localStorage.getItem("reader-line-height"));
  const legacyParagraphSpacing = Number(window.localStorage.getItem("reader-paragraph-spacing"));
  const legacyContentWidth = Number(window.localStorage.getItem("reader-content-width"));

  return sanitizeReaderStyleConfig({
    theme: legacyTheme ?? undefined,
    fontSize: Number.isFinite(legacyFontSize) ? legacyFontSize : undefined,
    fontFamily: legacyFontFamily ?? undefined,
    lineHeight: Number.isFinite(legacyLineHeight) ? legacyLineHeight : undefined,
    paragraphSpacing: Number.isFinite(legacyParagraphSpacing) ? legacyParagraphSpacing : undefined,
    contentWidth: Number.isFinite(legacyContentWidth) ? legacyContentWidth : undefined,
    tapEdgeEnabled: readLegacyTapEdgeEnabled(),
    skillEffectsEnabled: readLegacySkillEffectsEnabled()
  });
}

function readLegacyTapEdgeEnabled(): boolean | undefined {
  const raw = window.localStorage.getItem("reader:tap-edge-enabled");
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}

function readLegacySkillEffectsEnabled(): boolean | undefined {
  const raw = window.localStorage.getItem("reader:skill-effects-enabled");
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}

export function writeReaderStyleConfig(config: ReaderStyleConfig) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizeReaderStyleConfig(config);
  window.localStorage.setItem(READER_STYLE_STORAGE_KEY, JSON.stringify(sanitized));
}

export function isDefaultReaderStyleConfig(config: ReaderStyleConfig) {
  const normalized = sanitizeReaderStyleConfig(config);
  const defaults = sanitizeReaderStyleConfig({});
  return (
    normalized.theme === defaults.theme &&
    normalized.fontSize === defaults.fontSize &&
    normalized.fontFamily === defaults.fontFamily &&
    normalized.lineHeight === defaults.lineHeight &&
    normalized.paragraphSpacing === defaults.paragraphSpacing &&
    normalized.contentWidth === defaults.contentWidth &&
    normalized.layoutMode === defaults.layoutMode &&
    normalized.tapEdgeEnabled === defaults.tapEdgeEnabled &&
    normalized.skillEffectsEnabled === defaults.skillEffectsEnabled
  );
}
