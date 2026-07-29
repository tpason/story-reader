const UUID_AT_END = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function storyIdFromPathKey(value: string) {
  const match = value.match(UUID_AT_END);
  return match ? match[0] : value;
}

/** True when the user is already on this story's detail or a chapter reader. */
export function isViewingStoryPath(pathname: string | null | undefined, storyId?: string): boolean {
  if (!pathname || !storyId) return false;
  const match = pathname.match(/^\/stories\/([^/]+)(?:\/chapters\/\d+)?\/?$/);
  if (!match) return false;
  return storyIdFromPathKey(match[1]) === storyId;
}

/**
 * Global toast should not stack with page-local surfaces:
 * - reader → ReaderChapterFreshHint
 * - story detail → chapter shimmer / push hint
 * notification_update only refreshes the bell — no toast.
 */
export function shouldSuppressRealtimeToast(
  event: { type: string; storyId?: string },
  pathname: string | null | undefined
): boolean {
  if (event.type === "notification_update") return true;
  if (
    (event.type === "chapter_update" || event.type === "story_update") &&
    isViewingStoryPath(pathname, event.storyId)
  ) {
    return true;
  }
  return false;
}
