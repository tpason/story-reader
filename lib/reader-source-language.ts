/** English-origin crawl sources — bilingual reader is limited to these. */
export const ENGLISH_SOURCE_CODES = new Set([
  "royalroad",
  "lightnovelpub",
  "novelbin",
  "freewebnovel",
  "novelhub",
  "skydemonorder",
  "wetriedtls",
  "fanmtl",
  "novelfire"
]);

export function isEnglishSourceStory(sourceCode: string) {
  return ENGLISH_SOURCE_CODES.has(sourceCode.toLowerCase());
}

export function supportsBilingualReader(sourceCode: string) {
  return isEnglishSourceStory(sourceCode);
}
