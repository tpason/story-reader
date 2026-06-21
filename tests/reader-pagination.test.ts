import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildParagraphPages, pageIndexForParagraph } from "../lib/reader-pagination.ts";

describe("reader-pagination", () => {
  const baseOptions = {
    fontSize: 18,
    lineHeight: 1.8,
    paragraphSpacing: 1.1,
    contentWidth: 680,
    pageHeight: 420,
    headingReserve: 120
  };

  it("splits long chapters into multiple pages", () => {
    const paragraphs = Array.from({ length: 12 }, (_, index) => `Đoạn ${index + 1} `.repeat(28));
    const pages = buildParagraphPages(paragraphs, baseOptions);
    assert.ok(pages.length > 1);
    assert.equal(pages.flat().length, paragraphs.length);
  });

  it("finds page index for paragraph bookmark", () => {
    const pages = [[0, 1], [2, 3], [4]];
    assert.equal(pageIndexForParagraph(pages, 3), 1);
    assert.equal(pageIndexForParagraph(pages, 9), 0);
  });
});
