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

  return (
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

        if (onJump) {
          return (
            <button
              key={`${index}-${start}-${end}`}
              type="button"
              className={className}
              title={label}
              aria-label={label}
              onClick={() => onJump(jumpChapter)}
            />
          );
        }

        return <span key={`${index}-${start}-${end}`} className={className} title={label} aria-label={label} />;
      })}
    </div>
  );
}
