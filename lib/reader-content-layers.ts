import { formatNovelContent, READER_CONTENT_FORMAT_VERSION } from "@/lib/formatNovelContent";
import type { ChapterRow } from "@/lib/stories/_internal";
import { readerFormattedContent } from "@/lib/stories/_internal";

export type ContentLayer = "raw" | "translated" | "polished";

export const CONTENT_LAYER_ORDER: ContentLayer[] = ["polished", "translated", "raw"];

export type LayerLanguage = "en" | "vi" | "zh" | "ko" | "unknown";

export function layerLanguage(layer: ContentLayer, sourceCode: string): LayerLanguage {
  if (layer === "polished" || layer === "translated") return "vi";
  const code = sourceCode.toLowerCase();
  if (code === "qidian") return "zh";
  if (code === "naver_series") return "ko";
  if (["royalroad", "lightnovelpub", "novelbin", "freewebnovel", "novelhub", "skydemonorder", "wetriedtls", "fanmtl", "novelfire"].includes(code)) {
    return "en";
  }
  return "unknown";
}

export function layerLabel(layer: ContentLayer, lang: LayerLanguage) {
  if (layer === "polished") return "Bản polish";
  if (layer === "translated") return "Bản dịch";
  if (lang === "en") return "English (gốc)";
  if (lang === "zh") return "Bản gốc (Trung)";
  if (lang === "ko") return "Bản gốc (Hàn)";
  return "Bản gốc";
}

export function readLayerText(row: Pick<ChapterRow, "raw_text_content" | "translated_text_content" | "polished_text_content">, layer: ContentLayer) {
  if (layer === "raw") return row.raw_text_content?.trim() || null;
  if (layer === "translated") return row.translated_text_content?.trim() || null;
  return row.polished_text_content?.trim() || null;
}

export function listAvailableLayers(row: Pick<ChapterRow, "raw_text_content" | "translated_text_content" | "polished_text_content">) {
  return CONTENT_LAYER_ORDER.filter((layer) => Boolean(readLayerText(row, layer)));
}

export function resolvePrimaryLayer(
  available: ContentLayer[],
  requested?: ContentLayer | null
): ContentLayer {
  if (requested && available.includes(requested)) return requested;
  if (available.includes("polished")) return "polished";
  if (available.includes("translated")) return "translated";
  if (available.includes("raw")) return "raw";
  return "polished";
}

export function layerToParagraphs(options: {
  row: ChapterRow;
  layer: ContentLayer;
  chapterTitle: string;
}) {
  const { row, layer, chapterTitle } = options;
  const text = readLayerText(row, layer);
  if (!text) return [];

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
