export function buildPreviousChapterRecap(text: string | null | undefined, maxLength = 280) {
  if (!text?.trim()) return null;

  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const tail = normalized.slice(-Math.max(maxLength * 2, 420));
  const parts = tail.split(/(?<=[.!?…]["']?)\s+/u).filter(Boolean);
  const excerpt = (parts.length > 0 ? parts.slice(-3).join(" ") : tail).trim();
  if (!excerpt) return normalized.slice(0, maxLength).trim();

  if (excerpt.length <= maxLength) return excerpt;
  return `${excerpt.slice(0, maxLength - 1).trim()}…`;
}
