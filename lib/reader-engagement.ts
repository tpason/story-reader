const ENGAGE_DISMISS_PREFIX = "reader-engage-dismiss:";
const ENGAGE_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export const READER_ENGAGE_MIN_CHAPTER = 3;

export function readerEngagementDismissKey(storyId: string) {
  return `${ENGAGE_DISMISS_PREFIX}${storyId}`;
}

export function isReaderEngagementDismissed(storyId: string): boolean {
  const raw = window.localStorage.getItem(readerEngagementDismissKey(storyId));
  if (!raw) return false;
  const until = Number(raw);
  if (!Number.isFinite(until)) return false;
  return Date.now() < until;
}

export function dismissReaderEngagement(storyId: string) {
  window.localStorage.setItem(readerEngagementDismissKey(storyId), String(Date.now() + ENGAGE_DISMISS_MS));
}
