/**
 * Click-scoped shared-element cover transition (list → story hero).
 * Never assign a static view-transition-name on every StoryCover — only the
 * initiating cover (on intent) and the destination hero share `xi-story-cover`.
 */

export const STORY_COVER_VT_NAME = "xi-story-cover";

function vtDisabledByPerf(): boolean {
  if (typeof document === "undefined") return true;
  const root = document.documentElement;
  if (root.getAttribute("data-xi-vt") === "off") return true;
  if (root.getAttribute("data-xi-perf") === "saver") return true;
  if (root.getAttribute("data-xi-compact") === "1") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if (window.matchMedia("(max-width: 839px)").matches) return true;
  return false;
}

export function canUseStoryCoverViewTransition(): boolean {
  if (typeof document === "undefined") return false;
  if (!("startViewTransition" in document)) return false;
  return !vtDisabledByPerf();
}

/** Clear any previously armed list covers so only one name exists. */
export function clearArmedStoryCoverViewTransitions() {
  if (typeof document === "undefined") return;
  document.querySelectorAll<HTMLElement>("[data-story-cover][data-vt-armed='1']").forEach((el) => {
    el.style.viewTransitionName = "";
    el.removeAttribute("data-vt-armed");
  });
}

/**
 * Arm the cover inside a clicked card/link for the upcoming soft navigation.
 * Safe no-op when VT is unavailable or saver/compact/reduced-motion.
 */
export function armStoryCoverViewTransition(eventTarget: EventTarget | null) {
  if (!canUseStoryCoverViewTransition()) return;
  const root = eventTarget instanceof Element ? eventTarget : null;
  if (!root) return;
  const cover =
    (root.matches("[data-story-cover]") && root instanceof HTMLElement ? root : null) ??
    root.querySelector<HTMLElement>("[data-story-cover]");
  if (!cover) return;
  clearArmedStoryCoverViewTransitions();
  cover.style.viewTransitionName = STORY_COVER_VT_NAME;
  cover.setAttribute("data-vt-armed", "1");
  window.setTimeout(() => {
    if (cover.getAttribute("data-vt-armed") === "1") {
      cover.style.viewTransitionName = "";
      cover.removeAttribute("data-vt-armed");
    }
  }, 800);
}
