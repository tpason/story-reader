"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ReaderLogo } from "@/components/ReaderLogo";
import { useDecorativeWebglEnabled } from "@/lib/decorative-webgl";

const ThreeXianxiaLoader = dynamic(
  () => import("@/components/ThreeXianxiaLoader").then((m) => m.ThreeXianxiaLoader),
  { ssr: false, loading: () => null }
);

export function XianxiaLoader() {
  const [mounted, setMounted] = useState(false);
  const decorativeWebglEnabled = useDecorativeWebglEnabled({ tier: "global", allowCompact: true });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="xi-loader-overlay" role="status" aria-label="Đang tải...">
      <div className="xi-loader-canvas" aria-hidden="true">
        {mounted && decorativeWebglEnabled ? <ThreeXianxiaLoader /> : null}
      </div>

      <div className="xi-loader-css-rings" aria-hidden="true">
        <div className="xi-loader-ring xi-loader-ring-a" />
        <div className="xi-loader-ring xi-loader-ring-b" />
        <div className="xi-loader-ring xi-loader-ring-c" />
      </div>

      <div className="xi-loader-brand" aria-hidden="true">
        <ReaderLogo className="xi-loader-brand-mark" />
      </div>

      <div className="xi-loader-pillar" aria-hidden="true" />

      <div className="xi-loader-runes" aria-hidden="true">
        <span className="xi-loader-rune xi-loader-rune-1">靈</span>
        <span className="xi-loader-rune xi-loader-rune-2">卷</span>
        <span className="xi-loader-rune xi-loader-rune-3">閣</span>
        <span className="xi-loader-rune xi-loader-rune-4">道</span>
        <span className="xi-loader-rune xi-loader-rune-5">仙</span>
        <span className="xi-loader-rune xi-loader-rune-6">氣</span>
      </div>

      <div className="xi-loader-ui">
        <p className="xi-loader-hanzi">靈 quyển</p>
        <p className="xi-loader-viet">Linh Quyển Các</p>
        <div className="xi-loader-sep" aria-hidden="true" />
        <p className="xi-loader-status" aria-live="polite">
          <span className="xi-loader-cultivating">Đang khai quyển</span>
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
