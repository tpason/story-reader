export const READER_TAP_EDGE_KEY = "reader:tap-edge-enabled";
export const PARAGRAPH_VIRTUALIZE_THRESHOLD = 80;

export function readReaderTapEdgeEnabled(compactViewport = false) {
  if (typeof window === "undefined") return compactViewport;
  const raw = window.localStorage.getItem(READER_TAP_EDGE_KEY);
  if (raw === "0" || raw === "false") return false;
  if (raw === "1" || raw === "true") return true;
  return compactViewport;
}

export function writeReaderTapEdgeEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(READER_TAP_EDGE_KEY, enabled ? "1" : "0");
}

export function estimateParagraphHeight(
  text: string,
  options: { fontSize: number; lineHeight: number; paragraphSpacing: number; contentWidth: number }
) {
  const { fontSize, lineHeight, paragraphSpacing, contentWidth } = options;
  const charsPerLine = Math.max(20, Math.floor(contentWidth / Math.max(8, fontSize * 0.48)));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  const lineBlock = fontSize * lineHeight;
  return Math.round(lines * lineBlock + paragraphSpacing * fontSize + 34);
}
