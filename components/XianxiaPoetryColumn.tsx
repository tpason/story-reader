"use client";

// 6 columns × 4 words — read top-to-bottom, left-to-right.
// xi-poetry-cloud-bg reuses the #xi-cloud-f SVG filter from page.tsx
// for organic blob edges. No solid fill — only golden aura glow.
const COLUMNS = [
  ["Thiên", "Địa",  "Vi",    "Lô"],
  ["Linh",  "Khí",  "Tụ",    "Đỉnh"],
  ["Thần",  "Kiếm", "Bất",   "Xuất"],
  ["Vạn",   "Ma",   "Tự",    "Diệt"],
  ["Tu",    "Chân", "Ngàn",  "Năm"],
  ["Nhất",  "Niệm", "Thành", "Tiên"],
] as const;

export function XianxiaPoetryColumn() {
  return (
    <div className="xi-poetry-col" role="presentation" aria-hidden="true">
      <div className="xi-poetry-cloud-bg" />
      <div className="xi-poetry-grid">
        {COLUMNS.map((col, ci) => (
          <div key={ci} className="xi-poetry-pillar">
            {col.map((word, ri) => (
              <span
                key={ri}
                className="xi-poetry-line"
                style={{ "--col-i": ci, "--row-i": ri } as React.CSSProperties}
              >
                {word}
              </span>
            ))}
          </div>
        ))}
      </div>
      <span className="xi-poetry-shimmer" aria-hidden="true" />
    </div>
  );
}
