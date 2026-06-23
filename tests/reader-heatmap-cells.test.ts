import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatHeatmapCellLabel,
  heatmapCellChapterRange,
  resolveHeatmapCellCount
} from "../lib/reader-heatmap-cells.ts";

describe("reader heatmap cells", () => {
  it("caps cell count at 96", () => {
    assert.equal(resolveHeatmapCellCount(200), 96);
    assert.equal(resolveHeatmapCellCount(12), 12);
  });

  it("uses exact chapter labels for short stories", () => {
    const range = heatmapCellChapterRange(10, 0);
    assert.equal(range.start, 1);
    assert.equal(range.end, 1);
    assert.equal(formatHeatmapCellLabel(range.start, range.end), "Chương 1");
  });

  it("covers full story in last cell for long stories", () => {
    const lastIndex = resolveHeatmapCellCount(500) - 1;
    const range = heatmapCellChapterRange(500, lastIndex);
    assert.equal(range.end, 500);
    assert.ok(range.start < range.end);
    assert.match(formatHeatmapCellLabel(range.start, range.end), /–/);
  });
});
