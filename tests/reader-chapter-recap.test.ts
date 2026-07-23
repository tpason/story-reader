import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPreviousChapterRecap } from "../lib/reader-chapter-recap.ts";
import { buildGlossaryIndex, lookupGlossarySelection } from "../lib/reader-glossary.ts";
import { buildQuoteShareText } from "../lib/reader-share.ts";
import {
  clearReaderChapterForceTop,
  markReaderChapterStart,
  readerForceTopKey,
  resolveReaderRestoreTarget,
  shouldOfferResumeHint
} from "../lib/reader-resume.ts";

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

  it("clears force-top so swipe-back can resume paragraph", () => {
    const session = new Map<string, string>();
    (globalThis as { window?: Window & typeof globalThis }).window = {
      sessionStorage: {
        getItem: (key: string) => session.get(key) ?? null,
        setItem: (key: string, value: string) => {
          session.set(key, value);
        },
        removeItem: (key: string) => {
          session.delete(key);
        },
        clear: () => session.clear(),
        key: () => null,
        length: 0
      }
    } as Window & typeof globalThis;

    try {
      markReaderChapterStart("story-a", 12);
      assert.equal(session.get(readerForceTopKey("story-a", 12)), "true");
      clearReaderChapterForceTop("story-a", 12);
      assert.equal(session.get(readerForceTopKey("story-a", 12)), undefined);
      assert.deepEqual(
        resolveReaderRestoreTarget({
          forceTop: false,
          localParagraph: 18,
          localScroll: 2400
        }),
        { kind: "paragraph", paragraphIndex: 18 }
      );
    } finally {
      delete (globalThis as { window?: Window & typeof globalThis }).window;
    }
  });
});
