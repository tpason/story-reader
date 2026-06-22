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
