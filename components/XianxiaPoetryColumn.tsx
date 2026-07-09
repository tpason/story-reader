"use client";

import { XiDisplayFontScope } from "@/components/XiDisplayFontScope";

// 6 cột × 4 chữ — đọc trên→dưới từng cột (thất ngôn tuyệt cú).
// Mỗi cột là một cụm Hán-Việt trọn; cột 6 gắn motif Thiên Thư / đọc truyện.
const COLUMNS = [
  ["Linh", "Khí", "Tụ", "Đỉnh"],     // 灵气聚顶
  ["Thần", "Kiếm", "Bất", "Xuất"],   // 神剑不出
  ["Vạn", "Ma", "Tự", "Diệt"],       // 万魔自灭
  ["Tu", "Chân", "Ngàn", "Năm"],     // 修真千年
  ["Nhất", "Niệm", "Thành", "Tiên"], // 一念成仙
  ["Thiên", "Thư", "Khai", "Quyển"], // 天书开卷
] as const;

export function XianxiaPoetryColumn() {
  return (
    <XiDisplayFontScope className="xi-poetry-col" role="presentation" aria-hidden="true">
      <div className="xi-poetry-cloud-bg xi-cloud-aura xi-cloud-aura--secondary" />
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
    </XiDisplayFontScope>
  );
}
