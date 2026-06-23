import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSearchHighlightSegments,
  findChapterSearchMatches,
  findChapterSearchMatchesAcrossBlocks
} from "../lib/reader-in-chapter-search.ts";
import { truncateQuoteForCard } from "../lib/reader-quote-image.ts";

describe("reader in-chapter search", () => {
  it("finds case-insensitive matches across paragraphs", () => {
    const matches = findChapterSearchMatches(["Enkrid đánh", "Shinar nhìn Enkrid"], "enkrid");
    assert.equal(matches.length, 2);
    assert.equal(matches[0]?.paragraphIndex, 0);
    assert.equal(matches[1]?.paragraphIndex, 1);
    assert.equal(matches[0]?.chapterNumber, 0);
  });

  it("finds matches across inline chapter blocks", () => {
    const matches = findChapterSearchMatchesAcrossBlocks(
      [
        { chapterNumber: 5, paragraphs: ["Enkrid mở đầu"] },
        { chapterNumber: 6, paragraphs: ["Shinar gặp Enkrid"] }
      ],
      "enkrid"
    );
    assert.equal(matches.length, 2);
    assert.equal(matches[0]?.chapterNumber, 5);
    assert.equal(matches[1]?.chapterNumber, 6);
  });

  it("highlights active match segments", () => {
    const segments = buildSearchHighlightSegments("Enkrid và Enkrid", "Enkrid", { start: 10, end: 16 });
    assert.equal(segments.filter((segment) => segment.highlight).length, 2);
    assert.equal(segments.some((segment) => segment.active), true);
  });
});

describe("reader quote image", () => {
  it("truncates long quotes for card rendering", () => {
    const long = "a".repeat(300);
    assert.equal(truncateQuoteForCard(long).length, 280);
  });
});
