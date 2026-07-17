"use client";

/**
 * CSS/SVG tiểu hồ linh for mobile — cute gaze/blink/sway without WebGL.
 * Battery-friendly: rAF-throttled gaze, pause CSS when tab hidden.
 */

import { useEffect, useRef, useState } from "react";

export function ReaderSpiritCompanionLite() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lastPointerAt = useRef(0);
  const lastPointerX = useRef(0);
  const pendingGaze = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function flushGaze() {
      rafId.current = 0;
      const pending = pendingGaze.current;
      if (!pending || !root) return;
      pendingGaze.current = null;
      const nx = (pending.x / Math.max(window.innerWidth, 1)) * 2 - 1;
      const ny = -((pending.y / Math.max(window.innerHeight, 1)) * 2 - 1);
      const px = Math.max(-3.5, Math.min(3.5, nx * 2.8));
      const py = Math.max(-2.8, Math.min(2.8, -ny * 2.1));
      root.style.setProperty("--pupil-x", `${px.toFixed(2)}px`);
      root.style.setProperty("--pupil-y", `${py.toFixed(2)}px`);
    }

    function queueGaze(clientX: number, clientY: number) {
      pendingGaze.current = { x: clientX, y: clientY };
      if (!rafId.current) {
        rafId.current = window.requestAnimationFrame(flushGaze);
      }
    }

    function onPointer(e: PointerEvent) {
      lastPointerAt.current = performance.now();
      lastPointerX.current = e.clientX;
      queueGaze(e.clientX, e.clientY);
    }

    function onTouch(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      lastPointerAt.current = performance.now();
      lastPointerX.current = touch.clientX;
      queueGaze(touch.clientX, touch.clientY);
    }

    function onScroll() {
      if (performance.now() - lastPointerAt.current < 160) return;
      const readingY = window.innerHeight * 0.38;
      const readingX =
        lastPointerAt.current > 0 ? lastPointerX.current : window.innerWidth * 0.42;
      queueGaze(readingX, readingY);
    }

    function onVisibility() {
      const hidden = document.hidden;
      setPaused(hidden);
      if (hidden && rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = 0;
        pendingGaze.current = null;
      }
    }

    lastPointerX.current = window.innerWidth * 0.4;
    queueGaze(lastPointerX.current, window.innerHeight * 0.4);
    onVisibility();

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`reader-spirit-companion-lite${paused ? " is-paused" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" className="reader-spirit-companion-lite-svg" role="presentation">
        <defs>
          <radialGradient id="spirit-fur" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#fff8f0" />
            <stop offset="100%" stopColor="#e8d7c6" />
          </radialGradient>
          <radialGradient id="spirit-blush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5a8b0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f5a8b0" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* soft glow disc */}
        <ellipse cx="62" cy="88" rx="34" ry="8" fill="#c8962e" opacity="0.12" />
        <g className="spirit-lite-sway">
          <ellipse
            cx="26"
            cy="80"
            rx="20"
            ry="11"
            fill="url(#spirit-fur)"
            transform="rotate(-32 26 80)"
          />
          <ellipse cx="12" cy="72" rx="6.5" ry="5.5" fill="#d94a3d" opacity="0.92" />
        </g>
        <g className="spirit-lite-sway">
          <ellipse cx="56" cy="80" rx="30" ry="24" fill="url(#spirit-fur)" />
          <circle cx="56" cy="74" r="5.5" fill="#f0d06a" />
          <circle cx="56" cy="74" r="2.2" fill="#fff6d0" opacity="0.7" />
        </g>
        <g className="spirit-lite-head">
          <ellipse cx="78" cy="46" rx="24" ry="22" fill="url(#spirit-fur)" />
          {/* ears */}
          <polygon points="64,24 69,6 78,28" fill="url(#spirit-fur)" />
          <polygon points="70,22 72,12 76,26" fill="#f5b8c0" />
          <polygon points="82,28 92,6 98,26" fill="url(#spirit-fur)" />
          <polygon points="86,24 90,12 94,26" fill="#f5b8c0" />
          <circle cx="68" cy="10" r="2.8" fill="#d94a3d" />
          {/* snout */}
          <ellipse cx="96" cy="50" rx="11" ry="8" fill="#fff4ea" />
          <ellipse cx="103" cy="50" rx="3.4" ry="2.6" fill="#d94a3d" />
          {/* blush */}
          <ellipse cx="72" cy="54" rx="7" ry="4" fill="url(#spirit-blush)" />
          <ellipse cx="92" cy="52" rx="7" ry="4" fill="url(#spirit-blush)" />
          {/* big eyes */}
          <g className="spirit-lite-eyes">
            <ellipse cx="80" cy="44" rx="6.8" ry="8" fill="#2a1810" />
            <ellipse cx="92" cy="42" rx="6.8" ry="8" fill="#2a1810" />
            <circle className="spirit-lite-pupil" cx="81.6" cy="42.2" r="2.4" fill="#fff8f0" />
            <circle className="spirit-lite-pupil" cx="93.6" cy="40.2" r="2.4" fill="#fff8f0" />
            <circle cx="83.2" cy="46.5" r="1.1" fill="#fff8f0" opacity="0.55" />
            <circle cx="95.2" cy="44.5" r="1.1" fill="#fff8f0" opacity="0.55" />
            <ellipse className="spirit-lite-lid" cx="80" cy="44" rx="7.1" ry="8.3" fill="#eadfd3" />
            <ellipse className="spirit-lite-lid" cx="92" cy="42" rx="7.1" ry="8.3" fill="#eadfd3" />
          </g>
        </g>
      </svg>
    </div>
  );
}
