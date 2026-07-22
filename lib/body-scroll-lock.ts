/**
 * Ref-counted body scroll lock.
 * Multiple overlays (reader page-mode, sheets, modals) must share one owner
 * so nested lock/unlock cannot leave overflow stuck at "hidden".
 *
 * Also toggles `.xi-body-scroll-locked` so CSS `overflow: … !important`
 * (e.g. account-shell scroll unlock) cannot beat the lock.
 */

let lockCount = 0;
let originalOverflow = "";

const LOCK_CLASS = "xi-body-scroll-locked";

function applyLockClass(on: boolean) {
  const root = document.documentElement;
  const body = document.body;
  if (on) {
    root.classList.add(LOCK_CLASS);
    body.classList.add(LOCK_CLASS);
  } else {
    root.classList.remove(LOCK_CLASS);
    body.classList.remove(LOCK_CLASS);
  }
}

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    applyLockClass(true);
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (lockCount <= 0) return;
    lockCount -= 1;
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow;
      originalOverflow = "";
      applyLockClass(false);
    }
  };
}

/** Hard reset for route changes — clears stuck locks from uncoordinated cleanup. */
export function forceUnlockBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  originalOverflow = "";
  document.body.style.overflow = "";
  applyLockClass(false);
}

export function getBodyScrollLockCount() {
  return lockCount;
}
