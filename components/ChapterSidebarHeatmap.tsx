"use client";

type ChapterSidebarHeatmapProps = {
  totalChapters: number;
  maxReadChapter: number;
  activeChapterNumber: number;
  onJump?: (chapterNumber: number) => void;
};

const MAX_HEATMAP_CELLS = 96;

export function ChapterSidebarHeatmap({
  totalChapters,
  maxReadChapter,
  activeChapterNumber,
  onJump
}: ChapterSidebarHeatmapProps) {
  if (totalChapters <= 0) return null;

  const cellCount = Math.min(totalChapters, MAX_HEATMAP_CELLS);
  const chaptersPerCell = totalChapters / cellCount;

  return (
    <div
      className="chapter-sidebar-heatmap-grid"
      role="img"
      aria-label={`Tiến độ đọc: chương ${Math.max(0, maxReadChapter)} / ${totalChapters}`}
    >
      {Array.from({ length: cellCount }, (_, index) => {
        const chapterNumber = Math.min(totalChapters, Math.max(1, Math.floor(index * chaptersPerCell) + 1));
        const isRead = maxReadChapter > 0 && chapterNumber <= maxReadChapter;
        const isActive = chapterNumber === activeChapterNumber;
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
              key={`${index}-${chapterNumber}`}
              type="button"
              className={className}
              title={`Chương ${chapterNumber}`}
              aria-label={`Chương ${chapterNumber}`}
              onClick={() => onJump(chapterNumber)}
            />
          );
        }

        return <span key={`${index}-${chapterNumber}`} className={className} title={`Chương ${chapterNumber}`} />;
      })}
    </div>
  );
}
