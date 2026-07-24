/** Client watermark — user đã "đón linh tin" tới chương này (không cần đọc hết). */

const STORAGE_KEY = "reader:notify-caught-up";
export const NOTIFY_CAUGHT_UP_EVENT = "reader:notify-caught-up-change";

export type NotificationCaughtUpMap = Record<string, number>;

export function readNotificationCaughtUp(): NotificationCaughtUpMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const map: NotificationCaughtUpMap = {};
    for (const [storyId, chapter] of Object.entries(parsed)) {
      const n = Number(chapter);
      if (storyId && Number.isFinite(n) && n >= 0) map[storyId] = Math.floor(n);
    }
    return map;
  } catch {
    return {};
  }
}

export function markNotificationCaughtUp(storyId: string, throughChapter: number) {
  const map = readNotificationCaughtUp();
  map[storyId] = Math.max(map[storyId] ?? 0, Math.floor(throughChapter));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(NOTIFY_CAUGHT_UP_EVENT));
}

export function mergeCaughtUpMarks(
  map: NotificationCaughtUpMap,
  items: Array<{ storyId: string; totalChapters: number }>
): NotificationCaughtUpMap {
  const next: NotificationCaughtUpMap = { ...map };
  for (const item of items) {
    if (!item.storyId) continue;
    next[item.storyId] = Math.max(next[item.storyId] ?? 0, Math.floor(item.totalChapters));
  }
  return next;
}

/** Mark every listed story as caught up through its current total chapters. */
export function markAllNotificationsCaughtUp(items: Array<{ storyId: string; totalChapters: number }>) {
  if (typeof window === "undefined" || items.length === 0) return;
  const map = mergeCaughtUpMarks(readNotificationCaughtUp(), items);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(NOTIFY_CAUGHT_UP_EVENT));
}

export function effectiveMaxReadForNotify(
  storyId: string,
  maxReadChapterNumber: number,
  caughtUp: NotificationCaughtUpMap = readNotificationCaughtUp()
) {
  const ack = caughtUp[storyId] ?? 0;
  return Math.max(maxReadChapterNumber, ack);
}

export function isNotificationStoryVisible(
  storyId: string,
  totalChapters: number,
  maxReadChapterNumber: number,
  caughtUp: NotificationCaughtUpMap = readNotificationCaughtUp()
) {
  return totalChapters > effectiveMaxReadForNotify(storyId, maxReadChapterNumber, caughtUp);
}

export function computeNotificationUnread(
  storyId: string,
  totalChapters: number,
  maxReadChapterNumber: number,
  caughtUp: NotificationCaughtUpMap = readNotificationCaughtUp()
) {
  const maxRead = effectiveMaxReadForNotify(storyId, maxReadChapterNumber, caughtUp);
  return Math.max(0, totalChapters - maxRead);
}

export type NotificationListItem = {
  storyId: string;
  totalChapters: number;
  maxReadChapterNumber: number;
  unread: number;
  nextChapter: number | null;
};

export function adjustNotificationItem<T extends NotificationListItem>(item: T, caughtUp?: NotificationCaughtUpMap): T | null {
  const map = caughtUp ?? readNotificationCaughtUp();
  if (!isNotificationStoryVisible(item.storyId, item.totalChapters, item.maxReadChapterNumber, map)) return null;
  const unread = computeNotificationUnread(item.storyId, item.totalChapters, item.maxReadChapterNumber, map);
  const maxRead = effectiveMaxReadForNotify(item.storyId, item.maxReadChapterNumber, map);
  return {
    ...item,
    unread,
    nextChapter: unread > 0 ? maxRead + 1 : null
  };
}

export function adjustNotificationItems<T extends NotificationListItem>(items: T[], caughtUp?: NotificationCaughtUpMap): T[] {
  return items
    .map((item) => adjustNotificationItem(item, caughtUp))
    .filter((item): item is T => item !== null);
}
