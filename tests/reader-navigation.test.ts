import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateParagraphHeight,
  PARAGRAPH_VIRTUALIZE_THRESHOLD,
  readReaderTapEdgeEnabled,
  writeReaderTapEdgeEnabled
} from "../lib/reader-navigation.ts";

describe("reader-navigation", () => {
  it("estimates taller blocks for longer paragraphs", () => {
    const short = estimateParagraphHeight("Ngắn.", {
      fontSize: 18,
      lineHeight: 1.8,
      paragraphSpacing: 1.1,
      contentWidth: 680
    });
    const long = estimateParagraphHeight("A".repeat(900), {
      fontSize: 18,
      lineHeight: 1.8,
      paragraphSpacing: 1.1,
      contentWidth: 680
    });
    assert.ok(long > short);
  });

  it("does not pad short paragraphs with a huge fixed chrome height", () => {
    const short = estimateParagraphHeight("Ngắn.", {
      fontSize: 18,
      lineHeight: 1.8,
      paragraphSpacing: 1.1,
      contentWidth: 360
    });
    // One line + spacing(~20) + small chrome — should stay under ~3 lines of body.
    assert.ok(short < 18 * 1.8 * 3 + 40);
  });

  it("disables content paragraph window-virtualization", () => {
    assert.equal(PARAGRAPH_VIRTUALIZE_THRESHOLD, Number.POSITIVE_INFINITY);
  });

  it("defaults tap edge to compact viewport", () => {
    const storage = new Map<string, string>();
    (globalThis as { window?: Window & typeof globalThis }).window = {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
        key: () => null,
        length: 0
      } as Storage
    } as Window & typeof globalThis;

    assert.equal(readReaderTapEdgeEnabled(false), false);
    assert.equal(readReaderTapEdgeEnabled(true), true);
    writeReaderTapEdgeEnabled(false);
    assert.equal(readReaderTapEdgeEnabled(true), false);
    delete (globalThis as { window?: Window & typeof globalThis }).window;
  });
});
