const STORAGE_KEY = "reader:anonymous-id";

function randomGuestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `g_${crypto.randomUUID()}`;
  }
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable anonymous reader id for guest session analytics (localStorage). */
export function getAnonymousReaderId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)?.trim();
    if (existing && existing.length >= 8) return existing.slice(0, 120);
    const next = randomGuestId().slice(0, 120);
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return randomGuestId().slice(0, 120);
  }
}
