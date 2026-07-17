"use client";

/**
 * Tiểu hồ linh — CSS only by default (cool/quiet).
 * Drag via DOM (no React re-render while moving). Pose ticks sparsely.
 * WebGL only when performance mode is full_effects on desktop.
 */

import dynamic from "next/dynamic";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ReaderSpiritCompanionLite } from "@/components/ReaderSpiritCompanionLite";
import { useDeferredWebglMount } from "@/hooks/useDeferredWebglMount";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { prefersReducedMotion } from "@/lib/browser";
import {
  readReaderPerformanceMode,
  type ReaderPerformanceMode,
} from "@/lib/reader-performance-mode";
import {
  clampSpiritPos,
  readSpiritElapsedMs,
  readSpiritPos,
  spiritPoseFromElapsed,
  writeSpiritElapsedMs,
  writeSpiritPos,
  type SpiritPose,
  type SpiritPos,
  SPIRIT_DISMISS_KEY,
} from "@/lib/spirit-companion";

const ThreeReaderSpiritCompanion = dynamic(
  () =>
    import("@/components/ThreeReaderSpiritCompanion").then(
      (mod) => mod.ThreeReaderSpiritCompanion,
    ),
  { ssr: false },
);

const POSE_TICK_MS = 45_000;

type ReaderSpiritCompanionProps = {
  enabled?: boolean;
};

function readDismissed() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SPIRIT_DISMISS_KEY) === "1";
}

function ReaderSpiritCompanionImpl({ enabled = true }: ReaderSpiritCompanionProps) {
  const compact = useCompactViewport();
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const posRef = useRef<SpiritPos | null>(null);

  const [perfMode, setPerfMode] = useState<ReaderPerformanceMode>("balanced");
  const [motionOk, setMotionOk] = useState(true);
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [pose, setPose] = useState<SpiritPose>("stand");
  /** null until hydrated; then CSS default corner or saved left/top */
  const [pos, setPos] = useState<SpiritPos | null>(null);
  const [dragging, setDragging] = useState(false);

  const bootReady = useDeferredWebglMount(
    enabled && dismissed === false,
    compact ? 1200 : 2000,
  );

  useEffect(() => {
    setDismissed(readDismissed());
    const saved = readSpiritPos();
    if (saved) {
      const w = compact ? 78 : 112;
      const clamped = clampSpiritPos(saved.left, saved.top, w, w);
      posRef.current = clamped;
      setPos(clamped);
    }
    setPose(spiritPoseFromElapsed(readSpiritElapsedMs()));

    function sync() {
      const nextMode = readReaderPerformanceMode();
      const nextMotion = !prefersReducedMotion();
      setPerfMode((prev) => (prev === nextMode ? prev : nextMode));
      setMotionOk((prev) => (prev === nextMotion ? prev : nextMotion));
    }
    sync();
    window.addEventListener("reader:performance-mode", sync);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("reader:performance-mode", sync);
      mq.removeEventListener("change", sync);
    };
  }, [compact]);

  // Sparse pose clock — no 4s churn / sessionStorage spam
  useEffect(() => {
    if (dismissed !== false) return;
    let elapsed = readSpiritElapsedMs();
    let lastTick = performance.now();
    setPose(spiritPoseFromElapsed(elapsed));

    const id = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) {
        elapsed += now - lastTick;
        writeSpiritElapsedMs(elapsed);
        setPose((prev) => {
          const next = spiritPoseFromElapsed(elapsed);
          return prev === next ? prev : next;
        });
      }
      lastTick = now;
    }, POSE_TICK_MS);

    function onVis() {
      lastTick = performance.now();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      writeSpiritElapsedMs(elapsed);
    };
  }, [dismissed]);

  useEffect(() => {
    function onResize() {
      const el = rootRef.current;
      const prev = posRef.current;
      if (!prev || !el) return;
      const next = clampSpiritPos(prev.left, prev.top, el.offsetWidth, el.offsetHeight);
      posRef.current = next;
      el.style.left = `${next.left}px`;
      el.style.top = `${next.top}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      setPos(next);
    }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Pause CSS animations while scrolling (classList only — no React)
  useEffect(() => {
    if (dismissed !== false) return;
    let timer = 0;
    function pause() {
      rootRef.current?.classList.add("is-reading-quiet");
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        rootRef.current?.classList.remove("is-reading-quiet");
      }, 900);
    }
    window.addEventListener("scroll", pause, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", pause, true);
      if (timer) window.clearTimeout(timer);
    };
  }, [dismissed]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(SPIRIT_DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
    setDismissed(true);
  }, []);

  const onDragPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".reader-spirit-companion-close")) return;
    const el = rootRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Promote to explicit left/top if still using CSS right/bottom defaults
    if (!posRef.current) {
      const start = { left: rect.left, top: rect.top };
      posRef.current = start;
      el.style.left = `${start.left}px`;
      el.style.top = `${start.top}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
    }

    dragRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    el.setPointerCapture(e.pointerId);
    el.classList.add("is-dragging");
    setDragging(true);
  }, []);

  const onDragPointerMove = useCallback((e: ReactPointerEvent) => {
    const drag = dragRef.current;
    const el = rootRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !el) return;
    const next = clampSpiritPos(
      e.clientX - drag.offsetX,
      e.clientY - drag.offsetY,
      el.offsetWidth,
      el.offsetHeight,
    );
    posRef.current = next;
    // Direct DOM — avoid React re-render / WebGL remount every frame
    el.style.left = `${next.left}px`;
    el.style.top = `${next.top}px`;
  }, []);

  const endDrag = useCallback((e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    const el = rootRef.current;
    el?.classList.remove("is-dragging");
    setDragging(false);
    try {
      el?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    const finalPos = posRef.current;
    if (finalPos) {
      writeSpiritPos(finalPos);
      setPos(finalPos);
    }
  }, []);

  const batteryOff = perfMode === "battery_saver";
  const show =
    enabled && motionOk && !batteryOff && dismissed === false && bootReady;

  // WebGL companion is opt-in (full_effects) — default CSS keeps GPU cool
  const wantWebgl = show && !compact && perfMode === "full_effects";
  const webglReady = useDeferredWebglMount(wantWebgl, 2800);

  if (!show) return null;

  const posStyle: CSSProperties | undefined = pos
    ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" }
    : undefined;

  const useWebgl = wantWebgl && webglReady;

  const shellClass = [
    "reader-spirit-companion",
    "reader-spirit-companion--enter",
    useWebgl ? "" : "reader-spirit-companion--lite",
    dragging ? "is-dragging" : "",
    `reader-spirit-companion--pose-${pose}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rootRef}
      role="complementary"
      aria-label="Tiểu hồ linh"
      className={shellClass}
      style={posStyle}
      onPointerDown={onDragPointerDown}
      onPointerMove={onDragPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <button
        type="button"
        className="reader-spirit-companion-close"
        aria-label="Ẩn tiểu hồ linh"
        title="Ẩn tiểu hồ linh"
        onClick={dismiss}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span aria-hidden="true">×</span>
      </button>
      {pose === "sleep" ? (
        <div className="reader-spirit-zzz" aria-hidden="true">
          <span>z</span>
          <span>z</span>
          <span>z</span>
        </div>
      ) : null}
      <div aria-hidden="true">
        {useWebgl ? (
          <ThreeReaderSpiritCompanion pose={pose} />
        ) : (
          <ReaderSpiritCompanionLite pose={pose} />
        )}
      </div>
    </div>
  );
}

export const ReaderSpiritCompanion = memo(ReaderSpiritCompanionImpl);
