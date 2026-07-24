"use client";

type ChapterSidebarHeatmapProps = {
  totalChapters: number;
  maxReadChapter: number;
  activeChapterNumber: number;
  /** Kept for call-site compat; compact bar is not a jump map. */
  onJump?: (chapterNumber: number) => void;
};

/**
 * Compact reading progress for sidebar / story hero.
 * Former cell heatmap was dropped: on long novels (hundreds of chapters) it
 * ate the mục lục and read as noise rather than a jump map.
 */
export function ChapterSidebarHeatmap({
  totalChapters,
  maxReadChapter,
  activeChapterNumber
}: ChapterSidebarHeatmapProps) {
  if (totalChapters <= 0) return null;

  const readThrough = Math.min(totalChapters, Math.max(0, maxReadChapter));
  const progressPercent = Math.min(100, Math.max(0, Math.round((readThrough / totalChapters) * 100)));
  const progressLabel =
    readThrough > 0
      ? `Đã đọc tới chương ${readThrough}/${totalChapters} (${progressPercent}%)`
      : `Chưa đọc · ${totalChapters} chương`;
  const activeHint =
    activeChapterNumber > 0 && activeChapterNumber !== readThrough
      ? ` · đang mở ch.${activeChapterNumber}`
      : "";

  return (
    <div className="chapter-sidebar-heatmap-block chapter-sidebar-progress-compact">
      <p className="chapter-sidebar-heatmap-label">
        Tiến độ đọc
        <span>
          {progressLabel}
          {activeHint}
        </span>
      </p>
      <div
        className="chapter-sidebar-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-label={`Tiến độ đọc ${progressPercent}%`}
      >
        <span style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}
