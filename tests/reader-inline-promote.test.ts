import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inlineBlocksAfterHeadPromotion,
  shouldAutoPromotePrimaryChapter
} from "../lib/reader-inline-promote.ts";
import type { ReaderInlineChapterBlock } from "../lib/reader-inline-chapters.ts";

const INLINE: ReaderInlineChapterBlock[] = [
  {
    chapterId: "c6",
    chapterNumber: 6,
    title: "Ch 6",
    paragraphs: ["a"],
    nextChapter: { id: "c7", chapterNumber: 7, title: "Ch 7" }
  },
  {
    chapterId: "c7",
    chapterNumber: 7,
    title: "Ch 7",
    paragraphs: ["b"],
    nextChapter: null
  }
];

describe("reader inline promote", () => {
  it("promotes when reader passed primary and is in first inline", () => {
    const should = shouldAutoPromotePrimaryChapter({
      continuousEnabled: true,
      primaryChapterNumber: 5,
      visibleChapterNumber: 6,
      inlineChapters: INLINE,
      primarySectionBottomPx: 40,
      viewportHeight: 800
    });
    assert.equal(should, true);
  });

  it("does not promote while still on primary chapter", () => {
    const should = shouldAutoPromotePrimaryChapter({
      continuousEnabled: true,
      primaryChapterNumber: 5,
      visibleChapterNumber: 5,
      inlineChapters: INLINE,
      primarySectionBottomPx: 40,
      viewportHeight: 800
    });
    assert.equal(should, false);
  });

  it("does not promote while promote is in flight", () => {
    const should = shouldAutoPromotePrimaryChapter({
      continuousEnabled: true,
      primaryChapterNumber: 5,
      visibleChapterNumber: 6,
      inlineChapters: INLINE,
      primarySectionBottomPx: 40,
      viewportHeight: 800,
      promoteInFlight: true
    });
    assert.equal(should, false);
  });

  it("drops head inline block after promotion", () => {
    assert.equal(inlineBlocksAfterHeadPromotion(INLINE).length, 1);
    assert.equal(inlineBlocksAfterHeadPromotion(INLINE)[0]?.chapterNumber, 7);
  });
});
