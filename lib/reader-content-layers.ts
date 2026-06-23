type LayerTextFields = {
  raw_text_content?: string | null;
  translated_text_content?: string | null;
  polished_text_content?: string | null;
};

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

export function readLayerText(row: LayerTextFields, layer: ContentLayer) {
  if (layer === "raw") return row.raw_text_content?.trim() || null;
  if (layer === "translated") return row.translated_text_content?.trim() || null;
  return row.polished_text_content?.trim() || null;
}

export function listAvailableLayers(row: LayerTextFields) {
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
