export const READER_TAP_EDGE_KEY = "reader:tap-edge-enabled";
/**
 * Legacy threshold for content-window virtualization.
 * Reader body paragraphs are always document-flow now — absolute virtual rows
 * required height estimates and caused overlapping / gappy text.
 */
export const PARAGRAPH_VIRTUALIZE_THRESHOLD = Number.POSITIVE_INFINITY;

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
  // Bookmark gutter (~38px) + article padding — text column is narrower than contentWidth.
  const textWidth = Math.max(140, contentWidth - 56);
  // Vietnamese glyphs read wider than Latin; 0.58 under-counts lines less often (avoids overlap).
  const charsPerLine = Math.max(14, Math.floor(textWidth / Math.max(8, fontSize * 0.58)));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  const lineBlock = fontSize * lineHeight;
  // Spacing lives as padding on the virtual row (not collapsed margin).
  const spacing = paragraphSpacing * fontSize;
  return Math.round(lines * lineBlock + spacing + 10);
}
