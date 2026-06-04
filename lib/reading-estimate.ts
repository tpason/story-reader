export const READING_WORDS_PER_MINUTE = 100;
export const DAILY_READING_MINUTES = 60;
export const DEFAULT_WORDS_PER_CHAPTER = 1000;

const WORD_PATTERN = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

export function countReadableWords(content: string | null | undefined) {
  if (!content) return 0;
  return content.match(WORD_PATTERN)?.length ?? 0;
}

export function estimateReadingMinutes(wordCount: number) {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE));
}

export function estimateReadingDays(minutes: number) {
  if (minutes <= 0) return null;
  return Math.max(1, Math.ceil(minutes / DAILY_READING_MINUTES));
}

export function formatReadingDuration(minutes: number) {
  if (minutes <= 0) return "";
  if (minutes < 60) return `${minutes} phút`;

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  if (hours < 24) {
    return restMinutes > 0 ? `${hours} giờ ${restMinutes} phút` : `${hours} giờ`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days} ngày ${restHours} giờ` : `${days} ngày`;
}
