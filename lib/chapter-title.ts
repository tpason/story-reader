/**
 * Normalize chapter titles that already include "Chương N" so UI/metadata
 * never render "Chương 1: Chương 1" (or worse, triple prefixes).
 */

function stripLeadingChapterMarkers(chapterNumber: number, title: string): string {
  let text = title.trim();
  if (!text) return "";

  const markers = [
    new RegExp(`^(?:chương|chapter|ch\\.?)\\s*0*${chapterNumber}(?![0-9])\\s*[-–—:.|]*\\s*`, "i"),
    new RegExp(`^0*${chapterNumber}(?![0-9])\\s*[-–—:.]\\s+`, "i"),
  ];

  for (let guard = 0; guard < 6; guard += 1) {
    let changed = false;
    for (const marker of markers) {
      if (!marker.test(text)) continue;
      text = text.replace(marker, "").trim();
      changed = true;
    }
    if (!changed) break;
  }

  if (new RegExp(`^(?:chương|chapter)\\s*0*${chapterNumber}$`, "i").test(text)) {
    return "";
  }

  return text;
}

/** Full heading / SEO label: "Chương 3" or "Chương 3: Khởi đầu". */
export function formatChapterLabel(chapterNumber: number, title?: string | null): string {
  const body = stripLeadingChapterMarkers(chapterNumber, title ?? "");
  if (!body) return `Chương ${chapterNumber}`;
  return `Chương ${chapterNumber}: ${body}`;
}

/**
 * For lists that already show the number ("1. …"): subtitle only,
 * falling back to "Chương N" when the DB title is just the number.
 */
export function formatChapterCardTitle(chapterNumber: number, title?: string | null): string {
  return stripLeadingChapterMarkers(chapterNumber, title ?? "") || `Chương ${chapterNumber}`;
}
