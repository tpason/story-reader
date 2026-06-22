const DISMISS_PREFIX = "reader:detail-push-dismiss:";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export function isStoryDetailPushDismissed(storyId: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(`${DISMISS_PREFIX}${storyId}`);
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && Date.now() < until;
}

export function dismissStoryDetailPush(storyId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${DISMISS_PREFIX}${storyId}`, String(Date.now() + DISMISS_MS));
}
