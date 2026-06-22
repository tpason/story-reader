import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getPageScrollMetrics, scrollPageTo } from "@/lib/reader-scroll";

const AUTO_SCROLL_START_DELAY_MS = 140;
const AUTO_SCROLL_TOUCH_GUARD_MS = 420;
const AUTO_SCROLL_READ_PAUSE_MS = 4200;
const AUTO_SCROLL_STEP_DURATION_MS = 620;

const DEFAULT_AUTO_SCROLL_SPEED = 180;

export type UseAutoScrollOptions = {
  /** Pause the running animation without turning the feature off (e.g. a panel is open). */
  blocked: boolean;
  /** Force auto-scroll off and keep it off (e.g. page-flip layout). */
  disabled: boolean;
  /** Side effect to run when the user starts auto-scroll (e.g. close the mobile sheet). */
  onStart?: () => void;
};

export type UseAutoScrollResult = {
  enabled: boolean;
  speed: number;
  setSpeed: Dispatch<SetStateAction<number>>;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

/**
 * Auto-scroll ("tự cuộn") for the reader: a stepped, eased, read-paused scroll
 * loop that stops on user input (wheel/touch/key) and at the end of content.
 *
 * Blockers are passed in explicitly: `blocked` pauses the loop while keeping the
 * toggle on; `disabled` forces it off. The `onStart` callback lets the caller run
 * UI side effects (closing the mobile sheet) without the hook owning that state.
 */
export function useAutoScroll({ blocked, disabled, onStart }: UseAutoScrollOptions): UseAutoScrollResult {
  const [enabled, setEnabled] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_AUTO_SCROLL_SPEED);

  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const remainderRef = useRef(0);
  const startTimerRef = useRef<number | null>(null);
  const stepTimerRef = useRef<number | null>(null);
  const touchGuardUntilRef = useRef(0);

  // Keep onStart fresh without re-creating start()/toggle() each render.
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  // Force off whenever an incompatible layout (page-flip) is active.
  useEffect(() => {
    if (disabled && enabled) setEnabled(false);
  }, [disabled, enabled]);

  // The stepped scroll loop.
  useEffect(() => {
    if (!enabled || blocked) {
      if (stepTimerRef.current) {
        window.clearTimeout(stepTimerRef.current);
        stepTimerRef.current = null;
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimeRef.current = null;
      remainderRef.current = 0;
      return;
    }

    function scheduleNextStep(delayMs: number) {
      if (stepTimerRef.current) {
        window.clearTimeout(stepTimerRef.current);
      }
      stepTimerRef.current = window.setTimeout(() => {
        stepTimerRef.current = null;
        runStep();
      }, delayMs);
    }

    function animateStep(from: number, to: number, startedAt: number) {
      if (document.visibilityState === "hidden") {
        frameRef.current = null;
        scheduleNextStep(2000);
        return;
      }

      const elapsed = performance.now() - startedAt;
      const progress = Math.min(1, elapsed / AUTO_SCROLL_STEP_DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      scrollPageTo(from + (to - from) * eased);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(() => animateStep(from, to, startedAt));
        return;
      }

      frameRef.current = null;
      scheduleNextStep(AUTO_SCROLL_READ_PAUSE_MS);
    }

    function runStep() {
      const metrics = getPageScrollMetrics();
      const remaining = metrics.maxScrollTop - metrics.scrollTop;

      if (remaining <= 4) {
        setEnabled(false);
        frameRef.current = null;
        if (stepTimerRef.current) {
          window.clearTimeout(stepTimerRef.current);
          stepTimerRef.current = null;
        }
        remainderRef.current = 0;
        return;
      }

      const viewportAwareStep = Math.min(window.innerHeight * 0.42, Math.max(80, speed));
      const targetTop = Math.min(metrics.maxScrollTop, metrics.scrollTop + Math.min(remaining, viewportAwareStep));
      frameRef.current = window.requestAnimationFrame(() => animateStep(metrics.scrollTop, targetTop, performance.now()));
    }

    scheduleNextStep(720);
    return () => {
      if (stepTimerRef.current) {
        window.clearTimeout(stepTimerRef.current);
        stepTimerRef.current = null;
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimeRef.current = null;
      remainderRef.current = 0;
    };
  }, [enabled, speed, blocked]);

  // Stop on user-initiated scroll/navigation input.
  useEffect(() => {
    if (!enabled) return;

    const stop = () => setEnabled(false);
    const stopOnTouchMove = () => {
      if (performance.now() < touchGuardUntilRef.current) return;
      stop();
    };
    const stopOnKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Escape"].includes(event.key)) {
        stop();
      }
    };

    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stopOnTouchMove, { passive: true });
    window.addEventListener("keydown", stopOnKey);
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stopOnTouchMove);
      window.removeEventListener("keydown", stopOnKey);
    };
  }, [enabled]);

  // Clear any pending timers/frames on unmount.
  useEffect(() => {
    return () => {
      if (startTimerRef.current) {
        window.clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
      if (stepTimerRef.current) {
        window.clearTimeout(stepTimerRef.current);
        stepTimerRef.current = null;
      }
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  const start = useCallback(() => {
    if (startTimerRef.current) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    remainderRef.current = 0;
    lastTimeRef.current = null;
    touchGuardUntilRef.current = performance.now() + AUTO_SCROLL_START_DELAY_MS + AUTO_SCROLL_TOUCH_GUARD_MS;
    onStartRef.current?.();
    startTimerRef.current = window.setTimeout(() => {
      startTimerRef.current = null;
      setEnabled(true);
    }, AUTO_SCROLL_START_DELAY_MS);
  }, []);

  const stop = useCallback(() => {
    if (startTimerRef.current) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (stepTimerRef.current) {
      window.clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setEnabled(false);
    remainderRef.current = 0;
    lastTimeRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    if (enabled) {
      stop();
      return;
    }
    start();
  }, [enabled, start, stop]);

  return { enabled, speed, setSpeed, start, stop, toggle };
}
