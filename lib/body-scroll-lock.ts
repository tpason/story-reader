/**
 * Ref-counted body scroll lock.
 * Multiple overlays (reader page-mode, sheets, modals) must share one owner
 * so nested lock/unlock cannot leave overflow stuck at "hidden".
 */

let lockCount = 0;
let originalOverflow = "";

export function lockBodyScroll(): () => void {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
    }
  };
}

/** Hard reset for route changes — clears stuck locks from uncoordinated cleanup. */
export function forceUnlockBodyScroll() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  originalOverflow = "";
  document.body.style.overflow = "";
}

export function getBodyScrollLockCount() {
  return lockCount;
}
