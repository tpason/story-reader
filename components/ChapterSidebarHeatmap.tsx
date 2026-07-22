"use client";

import {
  formatHeatmapCellLabel,
  heatmapCellChapterRange,
  resolveHeatmapCellCount
} from "@/lib/reader-heatmap-cells";

type ChapterSidebarHeatmapProps = {
  totalChapters: number;
  maxReadChapter: number;
  activeChapterNumber: number;
  onJump?: (chapterNumber: number) => void;
};

export function ChapterSidebarHeatmap({
  totalChapters,
  maxReadChapter,
  activeChapterNumber,
  onJump
}: ChapterSidebarHeatmapProps) {
  const cellCount = resolveHeatmapCellCount(totalChapters);
  if (cellCount <= 0) return null;

  const showCellNumbers = cellCount <= 12;
  const progressLabel =
    maxReadChapter > 0
      ? `Đã đọc tới chương ${maxReadChapter}/${totalChapters}`
      : `Chưa đọc · ${totalChapters} chương — chạm ô để nhảy`;

  return (
    <div className="chapter-sidebar-heatmap-block">
      <p className="chapter-sidebar-heatmap-label">
        Tiến độ đọc
        <span>{progressLabel}</span>
      </p>
      <div
        className="chapter-sidebar-heatmap-grid"
        role="img"
        aria-label={`Tiến độ đọc: chương ${Math.max(0, maxReadChapter)} / ${totalChapters}`}
      >
        {Array.from({ length: cellCount }, (_, index) => {
          const { start, end, jumpChapter } = heatmapCellChapterRange(totalChapters, index);
          const isRead = maxReadChapter > 0 && start <= maxReadChapter;
          const isActive = activeChapterNumber >= start && activeChapterNumber <= end;
          const label = formatHeatmapCellLabel(start, end);
          const className = [
            "chapter-sidebar-heatmap-cell",
            isRead ? "chapter-sidebar-heatmap-cell-read" : "",
            isActive ? "chapter-sidebar-heatmap-cell-active" : ""
          ]
            .filter(Boolean)
            .join(" ");
          const numeral = start === end ? String(start) : String(start);

          if (onJump) {
            return (
              <button
                key={`${index}-${start}-${end}`}
                type="button"
                className={className}
                title={label}
                aria-label={label}
                onClick={() => onJump(jumpChapter)}
              >
                {showCellNumbers ? <span aria-hidden="true">{numeral}</span> : null}
              </button>
            );
          }

          return (
            <span key={`${index}-${start}-${end}`} className={className} title={label} aria-label={label}>
              {showCellNumbers ? <span aria-hidden="true">{numeral}</span> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
