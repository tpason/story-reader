export type ChapterSearchMatch = {
  paragraphIndex: number;
  start: number;
  end: number;
};

export function findChapterSearchMatches(paragraphs: string[], query: string): ChapterSearchMatch[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const matches: ChapterSearchMatch[] = [];
  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const text = paragraphs[paragraphIndex] ?? "";
    const lower = text.toLowerCase();
    let start = 0;
    while (start < lower.length) {
      const found = lower.indexOf(needle, start);
      if (found < 0) break;
      matches.push({
        paragraphIndex,
        start: found,
        end: found + needle.length
      });
      start = found + needle.length;
    }
  }
  return matches;
}

export type TextHighlightSegment = {
  text: string;
  highlight: boolean;
  active: boolean;
};

export function buildSearchHighlightSegments(
  text: string,
  query: string,
  activeRange?: { start: number; end: number } | null
): TextHighlightSegment[] {
  const needle = query.trim();
  if (!needle) return [{ text, highlight: false, active: false }];

  const lower = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const segments: TextHighlightSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const found = lower.indexOf(lowerNeedle, cursor);
    if (found < 0) {
      segments.push({ text: text.slice(cursor), highlight: false, active: false });
      break;
    }

    if (found > cursor) {
      segments.push({ text: text.slice(cursor, found), highlight: false, active: false });
    }

    const end = found + needle.length;
    const isActive = Boolean(activeRange && activeRange.start === found && activeRange.end === end);
    segments.push({ text: text.slice(found, end), highlight: true, active: isActive });
    cursor = end;
  }

  return segments.length > 0 ? segments : [{ text, highlight: false, active: false }];
}
