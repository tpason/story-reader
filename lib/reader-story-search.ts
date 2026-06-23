export type StoryContentSearchHit = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  paragraphIndex: number;
  excerpt: string;
};

export function buildStorySearchExcerpt(paragraph: string, needle: string, radius = 48) {
  const lower = paragraph.toLowerCase();
  const index = lower.indexOf(needle.toLowerCase());
  if (index < 0) return paragraph.slice(0, 120).trim();
  const start = Math.max(0, index - radius);
  const end = Math.min(paragraph.length, index + needle.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < paragraph.length ? "…" : "";
  return `${prefix}${paragraph.slice(start, end).trim()}${suffix}`;
}

export function splitStoryContentParagraphs(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
