export type ReaderTheme = "light" | "sepia" | "dark";
export type ReaderFontFamily = "literata" | "noto-serif" | "sora" | "merriweather" | "serif" | "sans";

export type ReaderStyleConfig = {
  theme: ReaderTheme;
  fontSize: number;
  fontFamily: ReaderFontFamily;
  lineHeight: number;
  paragraphSpacing: number;
  contentWidth: number;
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

const DEFAULTS: ReaderStyleConfig = {
  theme: "sepia",
  fontSize: 19,
  fontFamily: "literata",
  lineHeight: 1.82,
  paragraphSpacing: 1.24,
  contentWidth: 720
};

function isTheme(value: unknown): value is ReaderTheme {
  return value === "light" || value === "sepia" || value === "dark";
}

function isFontFamily(value: unknown): value is ReaderFontFamily {
  return value === "literata" || value === "noto-serif" || value === "sora" || value === "merriweather" || value === "serif" || value === "sans";
}

export function sanitizeReaderStyleConfig(input: unknown): ReaderStyleConfig {
  const candidate = (input ?? {}) as Partial<ReaderStyleConfig>;
  const theme = isTheme(candidate.theme) ? candidate.theme : DEFAULTS.theme;
  const fontFamily = isFontFamily(candidate.fontFamily) ? candidate.fontFamily : DEFAULTS.fontFamily;
  const fontSize = typeof candidate.fontSize === "number" && Number.isFinite(candidate.fontSize) ? candidate.fontSize : DEFAULTS.fontSize;
  const clampedFontSize = Math.min(READER_FONT_SIZE_MAX, Math.max(READER_FONT_SIZE_MIN, Math.round(fontSize)));
  const lineHeight = typeof candidate.lineHeight === "number" && Number.isFinite(candidate.lineHeight) ? candidate.lineHeight : DEFAULTS.lineHeight;
  const paragraphSpacing = typeof candidate.paragraphSpacing === "number" && Number.isFinite(candidate.paragraphSpacing) ? candidate.paragraphSpacing : DEFAULTS.paragraphSpacing;
  const contentWidth = typeof candidate.contentWidth === "number" && Number.isFinite(candidate.contentWidth) ? candidate.contentWidth : DEFAULTS.contentWidth;
  const clampedLineHeight = Math.min(READER_LINE_HEIGHT_MAX, Math.max(READER_LINE_HEIGHT_MIN, Math.round(lineHeight * 100) / 100));
  const clampedParagraphSpacing = Math.min(READER_PARAGRAPH_SPACING_MAX, Math.max(READER_PARAGRAPH_SPACING_MIN, Math.round(paragraphSpacing * 100) / 100));
  const clampedContentWidth = Math.min(READER_CONTENT_WIDTH_MAX, Math.max(READER_CONTENT_WIDTH_MIN, Math.round(contentWidth / 20) * 20));

  return {
    theme,
    fontSize: clampedFontSize,
    fontFamily,
    lineHeight: clampedLineHeight,
    paragraphSpacing: clampedParagraphSpacing,
    contentWidth: clampedContentWidth
  };
}

export function readReaderStyleConfig(): ReaderStyleConfig {
  if (typeof window === "undefined") return DEFAULTS;

  const raw = window.localStorage.getItem(READER_STYLE_STORAGE_KEY);
  if (raw) {
    try {
      return sanitizeReaderStyleConfig(JSON.parse(raw));
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
    contentWidth: Number.isFinite(legacyContentWidth) ? legacyContentWidth : undefined
  });
}

export function writeReaderStyleConfig(config: ReaderStyleConfig) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizeReaderStyleConfig(config);
  window.localStorage.setItem(READER_STYLE_STORAGE_KEY, JSON.stringify(sanitized));
}
