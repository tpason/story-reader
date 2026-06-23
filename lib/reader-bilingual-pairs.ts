import type { ContentLayer, LayerLanguage } from "@/lib/reader-content-layers";

export type BilingualParagraphPair = {
  index: number;
  primary: { layer: ContentLayer; lang: LayerLanguage; text: string };
  secondary: { layer: ContentLayer; lang: LayerLanguage; text: string } | null;
  alignment: "matched" | "primary_only" | "secondary_only";
};

export function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function buildBilingualParagraphPairs(options: {
  primaryParagraphs: string[];
  secondaryParagraphs: string[];
  primaryLayer: ContentLayer;
  secondaryLayer: ContentLayer;
  primaryLang: LayerLanguage;
  secondaryLang: LayerLanguage;
}): BilingualParagraphPair[] {
  const {
    primaryParagraphs,
    secondaryParagraphs,
    primaryLayer,
    secondaryLayer,
    primaryLang,
    secondaryLang
  } = options;

  const max = Math.max(primaryParagraphs.length, secondaryParagraphs.length);
  const pairs: BilingualParagraphPair[] = [];

  for (let index = 0; index < max; index += 1) {
    const primaryText = primaryParagraphs[index] ?? null;
    const secondaryText = secondaryParagraphs[index] ?? null;
    let alignment: BilingualParagraphPair["alignment"] = "matched";
    if (primaryText && !secondaryText) alignment = "primary_only";
    if (!primaryText && secondaryText) alignment = "secondary_only";

    pairs.push({
      index,
      primary: {
        layer: primaryLayer,
        lang: primaryLang,
        text: primaryText ?? ""
      },
      secondary: secondaryText
        ? {
            layer: secondaryLayer,
            lang: secondaryLang,
            text: secondaryText
          }
        : null,
      alignment
    });
  }

  return pairs.filter((pair) => pair.primary.text || pair.secondary?.text);
}
