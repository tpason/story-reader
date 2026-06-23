import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { buildGlossaryTextSpans } from "../lib/reader-glossary-inline.ts";
import { buildStorySearchExcerpt } from "../lib/reader-story-search.ts";
import type { GlossaryIndex } from "../lib/reader-glossary.ts";
import {
  readReaderAudioReadAlong,
  writeReaderAudioReadAlong
} from "../lib/reader-audio-read-along.ts";
import {
  readReaderContinuousChapter,
  writeReaderContinuousChapter
} from "../lib/reader-continuous-chapter.ts";
import { writeResumeNavigationTarget } from "../lib/reader-resume.ts";
import {
  markReaderOnboardingComplete,
  shouldShowReaderOnboarding
} from "../lib/reader-onboarding.ts";
import {
  canAppendInlineChapter,
  MAX_READER_INLINE_APPEND,
  resolveTailNextChapter,
  type ReaderInlineChapterBlock
} from "../lib/reader-inline-chapters.ts";
import {
  pickBestVisibleParagraphEntry,
  readVisibleChapterFromParagraph,
  readerParagraphPositionKey,
  type ReaderVisibleChapter
} from "../lib/reader-visible-chapter.ts";
import { readReaderCommentsSplit, writeReaderCommentsSplit } from "../lib/reader-comments-split.ts";

function installMockWindow() {
  const local = new Map<string, string>();
  const session = new Map<string, string>();

  const makeStorage = (map: Map<string, string>) =>
    ({
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, value);
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      clear: () => map.clear(),
      key: () => null,
      length: 0
    }) as Storage;

  (globalThis as { window?: Window & typeof globalThis }).window = {
    localStorage: makeStorage(local),
    sessionStorage: makeStorage(session)
  } as Window & typeof globalThis;

  return { local, session };
}

describe("reader-glossary-inline", () => {
  it("marks glossary names without overlapping shorter aliases", () => {
    const index: GlossaryIndex = new Map([
      ["enkrid", { name: "Enkrid", gender: "male", role: "Hiệp sĩ", pronouns3rd: "anh ta", personality: null, speechStyle: null }],
      ["encrid", { name: "Enkrid", gender: "male", role: "Hiệp sĩ", pronouns3rd: "anh ta", personality: null, speechStyle: null }]
    ]);

    const spans = buildGlossaryTextSpans("Encrid bước tới. Enkrid dừng lại.", index);
    const terms = spans.filter((span) => span.kind === "term");

    assert.equal(terms.length, 2);
    assert.equal(terms[0]?.value, "Encrid");
    assert.equal(terms[1]?.value, "Enkrid");
  });
});

describe("reader-story-search", () => {
  it("builds excerpt around the matched needle", () => {
    const excerpt = buildStorySearchExcerpt("Enkrid bước vào thành phố lớn và dừng lại.", "thành phố");
    assert.match(excerpt, /thành phố/);
    assert.match(excerpt, /^…|Enkrid/);
  });
});

describe("reader UX preference storage", () => {
  afterEach(() => {
    delete (globalThis as { window?: Window & typeof globalThis }).window;
  });

  it("persists continuous chapter preference", () => {
    installMockWindow();
    assert.equal(readReaderContinuousChapter(), false);
    writeReaderContinuousChapter(true);
    assert.equal(readReaderContinuousChapter(), true);
  });

  it("writes paragraph resume target to localStorage", () => {
    const { local, session } = installMockWindow();
    writeResumeNavigationTarget("story-1", 12, { paragraphIndex: 4, scrollPosition: 900 });
    assert.equal(local.get("reader:paragraph-position:story-1:12"), "4");
    assert.equal(session.get("reader:bookmark-scroll:story-1:12"), undefined);
  });

  it("falls back to scroll position when paragraph is missing", () => {
    const { session } = installMockWindow();
    writeResumeNavigationTarget("story-2", 3, { scrollPosition: 640 });
    assert.equal(session.get("reader:bookmark-scroll:story-2:3"), "640");
  });

  it("persists read-along preference", () => {
    const storage = new Map<string, string>();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => {
            storage.set(key, value);
          }
        }
      }
    });

    try {
      writeReaderAudioReadAlong(false);
      assert.equal(readReaderAudioReadAlong(), false);
      writeReaderAudioReadAlong(true);
      assert.equal(readReaderAudioReadAlong(), true);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow
      });
    }
  });

  it("shows onboarding until marked complete", () => {
    installMockWindow();
    assert.equal(shouldShowReaderOnboarding(), true);
    markReaderOnboardingComplete();
    assert.equal(shouldShowReaderOnboarding(), false);
  });
});

describe("reader inline chapters", () => {
  it("resolves tail next chapter from appended blocks", () => {
    const inline: ReaderInlineChapterBlock[] = [
      {
        chapterId: "c2",
        chapterNumber: 2,
        title: "Chương 2",
        paragraphs: ["a"],
        nextChapter: { id: "c3", chapterNumber: 3, title: "Chương 3" }
      }
    ];
    assert.equal(resolveTailNextChapter(inline, { id: "c2", chapterNumber: 2, title: "Chương 2" })?.chapterNumber, 3);
    assert.equal(resolveTailNextChapter([], { id: "c2", chapterNumber: 2, title: "Chương 2" })?.chapterNumber, 2);
  });

  it("caps inline append count", () => {
    assert.equal(canAppendInlineChapter(0), true);
    assert.equal(canAppendInlineChapter(MAX_READER_INLINE_APPEND - 1), true);
    assert.equal(canAppendInlineChapter(MAX_READER_INLINE_APPEND), false);
  });
});

describe("reader comments split preference", () => {
  afterEach(() => {
    delete (globalThis as { window?: Window & typeof globalThis }).window;
  });

  it("persists comments split preference", () => {
    installMockWindow();
    assert.equal(readReaderCommentsSplit(), false);
    writeReaderCommentsSplit(true);
    assert.equal(readReaderCommentsSplit(), true);
  });
});

describe("reader visible chapter", () => {
  it("reads chapter metadata from paragraph datasets", () => {
    const node = {
      dataset: {
        paragraphIndex: "4",
        chapterNumber: "12",
        chapterId: "chapter-12",
        chapterTitle: "Chương mười hai"
      }
    } as HTMLElement;

    const visible = readVisibleChapterFromParagraph(node, {
      chapterId: "fallback",
      chapterNumber: 1,
      chapterTitle: "Fallback",
      paragraphIndex: 0
    });

    assert.deepEqual(visible, {
      chapterId: "chapter-12",
      chapterNumber: 12,
      chapterTitle: "Chương mười hai",
      paragraphIndex: 4
    });
    assert.equal(readerParagraphPositionKey("story-1", 12), "reader:paragraph-position:story-1:12");
  });

  it("picks the paragraph with the strongest intersection ratio", () => {
    const entries = [
      { isIntersecting: true, intersectionRatio: 0.2, target: {} },
      { isIntersecting: true, intersectionRatio: 0.8, target: {} }
    ] as IntersectionObserverEntry[];

    assert.equal(pickBestVisibleParagraphEntry(entries)?.intersectionRatio, 0.8);
    assert.equal(pickBestVisibleParagraphEntry([]), null);
  });
});
