import type { ContentLayer, LayerLanguage } from "@/lib/reader-content-layers";

export type BilingualParagraphPair = {
  index: number;
  primary: { layer: ContentLayer; lang: LayerLanguage; text: string };
  secondary: { layer: ContentLayer; lang: LayerLanguage; text: string } | null;
  alignment: "matched" | "primary_only" | "secondary_only";
};

const INF = Number.POSITIVE_INFINITY;
/** Soft penalty so 2-1 / 1-2 beats forced 1-1 when lengths diverge. */
const MERGE_PENALTY = 0.18;
/** Skip one side when the other has leftover noise (titles, orphans). */
const SKIP_PENALTY = 0.95;

export function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function joinParagraphGroup(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function lengthMatchCost(primaryChars: number, secondaryChars: number, meanRatio: number) {
  if (primaryChars <= 0 && secondaryChars <= 0) return 0;
  if (primaryChars <= 0 || secondaryChars <= 0) return 1.25;
  const expectedSecondary = primaryChars * meanRatio;
  return Math.abs(secondaryChars - expectedSecondary) / Math.max(expectedSecondary, 1);
}

type AlignStep = { primaryCount: number; secondaryCount: number };

/**
 * Gale–Church-style paragraph alignment by character length.
 * Supports 1-1, 2-1, 1-2, and single-side skips so short EN lines can merge
 * into one polished Vietnamese paragraph (common after polish).
 */
export function alignParagraphGroups(primaryParagraphs: string[], secondaryParagraphs: string[]) {
  const n = primaryParagraphs.length;
  const m = secondaryParagraphs.length;
  if (n === 0 && m === 0) return [] as Array<{ primary: string[]; secondary: string[] }>;

  const primaryLens = primaryParagraphs.map((p) => p.length);
  const secondaryLens = secondaryParagraphs.map((p) => p.length);
  const primaryTotal = primaryLens.reduce((sum, len) => sum + len, 0) || 1;
  const secondaryTotal = secondaryLens.reduce((sum, len) => sum + len, 0) || 1;
  const meanRatio = secondaryTotal / primaryTotal;

  const cost: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => INF));
  const back: Array<Array<AlignStep | null>> = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => null)
  );
  cost[0][0] = 0;

  const consider = (i: number, j: number, di: number, dj: number, extra: number) => {
    const prev = cost[i][j];
    if (!Number.isFinite(prev)) return;
    const nextI = i + di;
    const nextJ = j + dj;
    if (nextI > n || nextJ > m) return;

    let primaryChars = 0;
    for (let k = i; k < nextI; k += 1) primaryChars += primaryLens[k] ?? 0;
    let secondaryChars = 0;
    for (let k = j; k < nextJ; k += 1) secondaryChars += secondaryLens[k] ?? 0;

    const stepCost =
      di > 0 && dj > 0
        ? lengthMatchCost(primaryChars, secondaryChars, meanRatio) + extra
        : SKIP_PENALTY + extra;
    const total = prev + stepCost;
    if (total < (cost[nextI][nextJ] ?? INF)) {
      cost[nextI][nextJ] = total;
      back[nextI][nextJ] = { primaryCount: di, secondaryCount: dj };
    }
  };

  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= m; j += 1) {
      if (!Number.isFinite(cost[i][j])) continue;
      consider(i, j, 1, 1, 0);
      consider(i, j, 2, 1, MERGE_PENALTY);
      consider(i, j, 1, 2, MERGE_PENALTY);
      // Allow one extra merge for tiny EN fragments ("Ah.") glued into the next bead.
      consider(i, j, 3, 1, MERGE_PENALTY * 2);
      consider(i, j, 1, 3, MERGE_PENALTY * 2);
      consider(i, j, 1, 0, 0);
      consider(i, j, 0, 1, 0);
    }
  }

  const groups: Array<{ primary: string[]; secondary: string[] }> = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const step = back[i]?.[j];
    if (!step) {
      // Fallback if DP path broke — consume remaining 1-1 / leftovers.
      if (i > 0 && j > 0) {
        groups.push({ primary: [primaryParagraphs[i - 1]!], secondary: [secondaryParagraphs[j - 1]!] });
        i -= 1;
        j -= 1;
        continue;
      }
      if (i > 0) {
        groups.push({ primary: [primaryParagraphs[i - 1]!], secondary: [] });
        i -= 1;
        continue;
      }
      if (j > 0) {
        groups.push({ primary: [], secondary: [secondaryParagraphs[j - 1]!] });
        j -= 1;
        continue;
      }
      break;
    }

    const { primaryCount, secondaryCount } = step;
    groups.push({
      primary: primaryCount > 0 ? primaryParagraphs.slice(i - primaryCount, i) : [],
      secondary: secondaryCount > 0 ? secondaryParagraphs.slice(j - secondaryCount, j) : []
    });
    i -= primaryCount;
    j -= secondaryCount;
  }

  groups.reverse();
  return groups;
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

  const groups = alignParagraphGroups(primaryParagraphs, secondaryParagraphs);

  const pairs: BilingualParagraphPair[] = [];

  for (const group of groups) {
    const primaryText = joinParagraphGroup(group.primary);
    const secondaryText = joinParagraphGroup(group.secondary);
    if (!primaryText && !secondaryText) continue;

    let alignment: BilingualParagraphPair["alignment"] = "matched";
    if (primaryText && !secondaryText) alignment = "primary_only";
    if (!primaryText && secondaryText) alignment = "secondary_only";

    pairs.push({
      index: pairs.length,
      primary: {
        layer: primaryLayer,
        lang: primaryLang,
        text: primaryText
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

  return pairs;
}
