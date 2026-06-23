import type { GlossaryCharacter, GlossaryIndex } from "./reader-glossary";

export type GlossaryTextSpan =
  | { kind: "text"; value: string }
  | { kind: "term"; value: string; character: GlossaryCharacter };

/** Longest-match-first glossary spans for inline tap targets in paragraph text. */
export function buildGlossaryTextSpans(text: string, index: GlossaryIndex): GlossaryTextSpan[] {
  if (!text || index.size === 0) return [{ kind: "text", value: text }];

  const terms = [...index.keys()]
    .filter((term) => term.length >= 2)
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0) return [{ kind: "text", value: text }];

  const lower = text.toLowerCase();
  const occupied = new Array<boolean>(text.length).fill(false);
  const matches: Array<{ start: number; end: number; character: GlossaryCharacter; value: string }> = [];

  for (const term of terms) {
    const character = index.get(term);
    if (!character) continue;
    let from = 0;
    while (from < lower.length) {
      const start = lower.indexOf(term, from);
      if (start < 0) break;
      const end = start + term.length;
      if (!occupied.slice(start, end).some(Boolean)) {
        for (let i = start; i < end; i += 1) occupied[i] = true;
        matches.push({ start, end, character, value: text.slice(start, end) });
      }
      from = start + 1;
    }
  }

  if (matches.length === 0) return [{ kind: "text", value: text }];

  matches.sort((a, b) => a.start - b.start);
  const spans: GlossaryTextSpan[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) {
      spans.push({ kind: "text", value: text.slice(cursor, match.start) });
    }
    spans.push({ kind: "term", value: match.value, character: match.character });
    cursor = match.end;
  }
  if (cursor < text.length) {
    spans.push({ kind: "text", value: text.slice(cursor) });
  }
  return spans;
}
