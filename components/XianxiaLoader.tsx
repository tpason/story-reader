"use client";

import { ReaderLogo } from "@/components/ReaderLogo";

/** Route-transition loader — CSS only (no WebGL remount per navigation). */
export function XianxiaLoader() {
  return (
    <div className="xi-loader-overlay" role="status" aria-label="Đang tải...">
      <div className="xi-loader-canvas" aria-hidden="true" />

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
