/**
 * Cross-browser page-scroll helpers for the reader.
 *
 * The reader scrolls the document (not a nested container), so these normalize
 * the various scrollTop sources and force `scrollBehavior: auto` for precise,
 * jump-free positioning (used by auto-scroll and scroll restoration).
 */

export type PageScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
  maxScrollTop: number;
};

export function getPageScrollMetrics(): PageScrollMetrics {
  const doc = document.documentElement;
  const body = document.body;
  const scrollingElement = document.scrollingElement ?? doc;
  const scrollTop = scrollingElement.scrollTop || window.scrollY || window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
  const scrollHeight = Math.max(scrollingElement.scrollHeight, doc.scrollHeight, body.scrollHeight, doc.clientHeight);
  const viewportHeight = window.innerHeight || doc.clientHeight || 1;
  return {
    scrollTop,
    scrollHeight,
    viewportHeight,
    maxScrollTop: Math.max(0, scrollHeight - viewportHeight),
  };
}

export function scrollPageTo(top: number) {
  const nextTop = Math.max(0, Math.round(top));
  const doc = document.documentElement;
  const body = document.body;
  const scrollingElement = document.scrollingElement ?? doc;
  const previousDocScrollBehavior = doc.style.scrollBehavior;
  const previousBodyScrollBehavior = body.style.scrollBehavior;

  doc.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";
  scrollingElement.scrollTop = nextTop;
  doc.scrollTop = nextTop;
  body.scrollTop = nextTop;

  if (Math.abs(window.scrollY - nextTop) > 1) {
    window.scrollTo({ top: nextTop, behavior: "auto" });
  }

  doc.style.scrollBehavior = previousDocScrollBehavior;
  body.style.scrollBehavior = previousBodyScrollBehavior;
}

export type ScheduleUntilOptions = {
  maxAttempts?: number;
  intervalMs?: number;
  /** Grow delay between attempts to cut timer/layout thrash (default true). */
  backoff?: boolean;
};

/**
 * Retry `attempt` until it returns true or maxAttempts is reached.
 * Returns a cancel function.
 */
export function scheduleUntil(attempt: () => boolean, options: ScheduleUntilOptions = {}) {
  const maxAttempts = options.maxAttempts ?? 16;
  const intervalMs = options.intervalMs ?? 64;
  const useBackoff = options.backoff !== false;
  let attempts = 0;
  let timer: number | null = null;
  let cancelled = false;

  const run = () => {
    if (cancelled) return;
    attempts += 1;
    let done = false;
    try {
      done = attempt();
    } catch {
      done = attempts >= maxAttempts;
    }
    if (done || attempts >= maxAttempts) return;
    const delay = useBackoff
      ? Math.min(240, Math.round(intervalMs * 1.35 ** (attempts - 1)))
      : intervalMs;
    timer = window.setTimeout(() => {
      timer = null;
      window.requestAnimationFrame(run);
    }, delay);
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(run);
  });

  return () => {
    cancelled = true;
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };
}

/**
 * Restore document scroll after chapter content/layout may still be growing.
 * Keeps trying while maxScrollTop is too short for the saved position.
 */
export function schedulePageScrollRestore(top: number, options: ScheduleUntilOptions = {}) {
  const target = Math.max(0, Math.round(top));
  if (target <= 0) {
    scrollPageTo(0);
    return () => undefined;
  }

  return scheduleUntil(() => {
    const { maxScrollTop } = getPageScrollMetrics();
    if (maxScrollTop + 2 < target) {
      // Layout not tall enough yet — nudge and wait for content.
      scrollPageTo(Math.min(target, Math.max(0, maxScrollTop)));
      return false;
    }
    scrollPageTo(target);
    const { scrollTop, maxScrollTop: latestMax } = getPageScrollMetrics();
    return Math.abs(scrollTop - Math.min(target, latestMax)) <= 2;
  }, options);
}
