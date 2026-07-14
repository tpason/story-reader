import { formatNovelContent, READER_CONTENT_FORMAT_VERSION } from "@/lib/formatNovelContent";
import type { ChapterRow } from "@/lib/stories/_internal";
import { readerFormattedContent } from "@/lib/stories/_internal";
import { readLayerText, type ContentLayer } from "@/lib/reader-content-layers";

export function layerToParagraphs(options: {
  row: ChapterRow;
  layer: ContentLayer;
  chapterTitle: string;
  /** Bilingual pairing: same splitter both sides, never reader_formatted cache. */
  forBilingual?: boolean;
}) {
  const { row, layer, chapterTitle, forBilingual = false } = options;
  const text = readLayerText(row, layer);
  if (!text) return [];

  if (forBilingual) {
    return formatNovelContent(text, undefined, chapterTitle, { preserveParagraphBoundaries: true });
  }

  if (layer === "polished" && row.reader_formatted_content_version === READER_CONTENT_FORMAT_VERSION) {
    const formatted = readerFormattedContent(row);
    if (formatted) {
      return formatted
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    }
  }

  return formatNovelContent(text, undefined, chapterTitle);
}
