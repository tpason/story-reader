import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatChapterCardTitle, formatChapterLabel } from "../lib/chapter-title.ts";

describe("formatChapterLabel", () => {
  it("returns number-only label when title missing", () => {
    assert.equal(formatChapterLabel(1, null), "Chương 1");
    assert.equal(formatChapterLabel(2, "  "), "Chương 2");
  });

  it("dedupes Chương N prefixes from bad crawl titles", () => {
    assert.equal(formatChapterLabel(1, "Chương 1"), "Chương 1");
    assert.equal(formatChapterLabel(1, "Chương 1: Chương 1"), "Chương 1");
    assert.equal(formatChapterLabel(1, "Chương 1 - Chương 1"), "Chương 1");
  });

  it("keeps real subtitles once", () => {
    assert.equal(formatChapterLabel(3, "Khởi đầu"), "Chương 3: Khởi đầu");
    assert.equal(formatChapterLabel(3, "Chương 3: Khởi đầu"), "Chương 3: Khởi đầu");
  });

  it("strips leading number lists", () => {
    assert.equal(formatChapterLabel(5, "5. Gặp nạn"), "Chương 5: Gặp nạn");
  });

  it("does not treat Chương 10 as Chương 1", () => {
    assert.equal(formatChapterLabel(1, "Chương 10: Kết"), "Chương 1: Chương 10: Kết");
    assert.equal(formatChapterLabel(10, "Chương 10: Kết"), "Chương 10: Kết");
  });
});

describe("formatChapterCardTitle", () => {
  it("returns secondary text for numbered lists", () => {
    assert.equal(formatChapterCardTitle(1, "Chương 1: Chương 1"), "Chương 1");
    assert.equal(formatChapterCardTitle(1, "Chương 1: Gặp nạn"), "Gặp nạn");
    assert.equal(formatChapterCardTitle(8, null), "Chương 8");
  });
});
