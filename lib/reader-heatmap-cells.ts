export const MAX_HEATMAP_CELLS = 96;

export function resolveHeatmapCellCount(totalChapters: number, maxCells = MAX_HEATMAP_CELLS) {
  if (totalChapters <= 0) return 0;
  return Math.min(totalChapters, maxCells);
}

export function heatmapCellChapterRange(
  totalChapters: number,
  cellIndex: number,
  maxCells = MAX_HEATMAP_CELLS
): { start: number; end: number; jumpChapter: number } {
  const cellCount = resolveHeatmapCellCount(totalChapters, maxCells);
  if (cellCount <= 0) return { start: 1, end: 1, jumpChapter: 1 };

  const chaptersPerCell = totalChapters / cellCount;
  const start = Math.min(totalChapters, Math.max(1, Math.floor(cellIndex * chaptersPerCell) + 1));
  const end =
    cellIndex >= cellCount - 1
      ? totalChapters
      : Math.min(totalChapters, Math.floor((cellIndex + 1) * chaptersPerCell));
  return { start, end, jumpChapter: start };
}

export function formatHeatmapCellLabel(start: number, end: number) {
  return start === end ? `Chương ${start}` : `Chương ${start}–${end}`;
}
