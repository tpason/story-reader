import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPreviousChapterRecap } from "../lib/reader-chapter-recap.ts";
import { buildGlossaryIndex, lookupGlossarySelection } from "../lib/reader-glossary.ts";
import { buildQuoteShareText } from "../lib/reader-share.ts";
import { resolveReaderRestoreTarget, shouldOfferResumeHint } from "../lib/reader-resume.ts";

describe("reader chapter recap", () => {
  it("returns null for empty recap input", () => {
    assert.equal(buildPreviousChapterRecap(""), null);
  });

  it("prefers the tail of a long chapter", () => {
    const recap = buildPreviousChapterRecap("A. ".repeat(120) + "Kết cục là hắn đã thoát được.");
    assert.ok(recap?.includes("Kết cục"));
  });
});

describe("reader glossary", () => {
  it("matches aliases and canonical names", () => {
    const index = buildGlossaryIndex(
      [{ name: "Enkrid", gender: "male", role: "MC", pronouns3rd: "anh ta", personality: null, speechStyle: null }],
      { Encrid: "Enkrid" }
    );
    assert.equal(lookupGlossarySelection("Encrid", index)?.name, "Enkrid");
  });
});

describe("reader share", () => {
  it("builds quote share text", () => {
    const text = buildQuoteShareText({
      quote: "Hello",
      storyTitle: "Story",
      chapterTitle: "Start",
      chapterNumber: 2,
      storyPath: "/stories/1/chapters/2"
    });
    assert.match(text, /Hello/);
    assert.match(text, /Ch\.2/);
  });
});

describe("reader resume", () => {
  it("offers resume when progress is meaningful", () => {
    assert.equal(shouldOfferResumeHint("story", 3, 12, null), true);
    assert.equal(shouldOfferResumeHint("story", 3, 2, null), false);
  });

  it("resolves restore target with paragraph preferred over scroll", () => {
    assert.deepEqual(
      resolveReaderRestoreTarget({
        localParagraph: 7,
        localScroll: 1200,
        sameChapter: true,
        historyScroll: 900,
        historyParagraph: 3
      }),
      { kind: "paragraph", paragraphIndex: 7 }
    );
    assert.deepEqual(
      resolveReaderRestoreTarget({
        bookmarkScroll: 640,
        localParagraph: 4,
        sameChapter: true
      }),
      { kind: "scroll", top: 640 }
    );
    assert.deepEqual(
      resolveReaderRestoreTarget({
        forceTop: true,
        localScroll: 900,
        sameChapter: true
      }),
      { kind: "force-top" }
    );
    assert.deepEqual(
      resolveReaderRestoreTarget({
        sameChapter: true,
        historyScroll: 420,
        historyParagraph: null
      }),
      { kind: "scroll", top: 420 }
    );
  });
});
