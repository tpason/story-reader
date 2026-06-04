"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ThreeXianxiaLoader = dynamic(
  () => import("@/components/ThreeXianxiaLoader").then((m) => m.ThreeXianxiaLoader),
  { ssr: false, loading: () => null }
);

export function XianxiaLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="xi-loader-overlay" role="status" aria-label="Đang tải...">
      {/* Three.js WebGL formation */}
      <div className="xi-loader-canvas" aria-hidden="true">
        {mounted ? <ThreeXianxiaLoader /> : null}
      </div>

      {/* CSS-only rings — visible immediately as WebGL loads */}
      <div className="xi-loader-css-rings" aria-hidden="true">
        <div className="xi-loader-ring xi-loader-ring-a" />
        <div className="xi-loader-ring xi-loader-ring-b" />
        <div className="xi-loader-ring xi-loader-ring-c" />
      </div>

      {/* Heavenly light pillar */}
      <div className="xi-loader-pillar" aria-hidden="true" />

      {/* Floating rune characters */}
      <div className="xi-loader-runes" aria-hidden="true">
        <span className="xi-loader-rune xi-loader-rune-1">天</span>
        <span className="xi-loader-rune xi-loader-rune-2">道</span>
        <span className="xi-loader-rune xi-loader-rune-3">靈</span>
        <span className="xi-loader-rune xi-loader-rune-4">氣</span>
        <span className="xi-loader-rune xi-loader-rune-5">仙</span>
        <span className="xi-loader-rune xi-loader-rune-6">劍</span>
      </div>

      {/* Text UI */}
      <div className="xi-loader-ui">
        <p className="xi-loader-hanzi">靈卷閣</p>
        <p className="xi-loader-viet">Linh Quyển Các</p>
        <div className="xi-loader-sep" aria-hidden="true" />
        <p className="xi-loader-status" aria-live="polite">
          <span className="xi-loader-cultivating">修煉中</span>
          <span className="xi-loader-dots" aria-hidden="true">
            <span>．</span>
            <span>．</span>
            <span>．</span>
          </span>
        </p>
      </div>
    </div>
  );
}
