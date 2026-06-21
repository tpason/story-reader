import { estimateParagraphHeight } from "./reader-navigation.ts";

export type ParagraphPageBuildOptions = {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  contentWidth: number;
  pageHeight: number;
  headingReserve?: number;
  pageChromeReserve?: number;
};

/** Indicator, nav buttons, and shell gaps inside reader-page-shell. */
export const READER_PAGE_CHROME_RESERVE = 110;

export function buildParagraphPagesFromHeights(
  heights: number[],
  options: Pick<ParagraphPageBuildOptions, "pageHeight" | "headingReserve" | "pageChromeReserve">
) {
  if (heights.length === 0) return [[]] as number[][];

  const headingReserve = Math.max(0, options.headingReserve ?? 0);
  const chromeReserve = Math.max(0, options.pageChromeReserve ?? READER_PAGE_CHROME_RESERVE);
  const baseHeight = Math.max(120, options.pageHeight - chromeReserve);
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  let limit = Math.max(80, baseHeight - headingReserve);

  for (let index = 0; index < heights.length; index += 1) {
    const blockHeight = Math.max(1, Math.ceil(heights[index] ?? 0));
    if (current.length > 0 && used + blockHeight > limit) {
      pages.push(current);
      current = [index];
      used = blockHeight;
      limit = baseHeight;
      continue;
    }
    current.push(index);
    used += blockHeight;
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

export function buildParagraphPages(paragraphs: string[], options: ParagraphPageBuildOptions) {
  if (paragraphs.length === 0) return [[]] as number[][];

  const headingReserve = Math.max(0, options.headingReserve ?? 0);
  const baseHeight = Math.max(160, options.pageHeight);
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  let limit = Math.max(120, baseHeight - headingReserve);

  for (let index = 0; index < paragraphs.length; index += 1) {
    const blockHeight = estimateParagraphHeight(paragraphs[index] ?? "", options);
    if (current.length > 0 && used + blockHeight > limit) {
      pages.push(current);
      current = [index];
      used = blockHeight;
      limit = baseHeight;
      continue;
    }
    current.push(index);
    used += blockHeight;
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

export function pageIndexForParagraph(pages: number[][], paragraphIndex: number) {
  const found = pages.findIndex((page) => page.includes(paragraphIndex));
  return found >= 0 ? found : 0;
}
