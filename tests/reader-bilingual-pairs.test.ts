import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBilingualParagraphPairs } from "../lib/reader-bilingual-pairs.ts";

describe("buildBilingualParagraphPairs", () => {
  it("aligns paragraphs by index", () => {
    const pairs = buildBilingualParagraphPairs({
      primaryParagraphs: ["Hello.", "Second line."],
      secondaryParagraphs: ["Xin chào.", "Dòng hai."],
      primaryLayer: "raw",
      secondaryLayer: "polished",
      primaryLang: "en",
      secondaryLang: "vi"
    });

    assert.equal(pairs.length, 2);
    assert.equal(pairs[0]?.alignment, "matched");
    assert.equal(pairs[0]?.primary.text, "Hello.");
    assert.equal(pairs[0]?.secondary?.text, "Xin chào.");
  });

  it("marks primary-only when secondary is shorter", () => {
    const pairs = buildBilingualParagraphPairs({
      primaryParagraphs: ["One", "Two"],
      secondaryParagraphs: ["Một"],
      primaryLayer: "raw",
      secondaryLayer: "polished",
      primaryLang: "en",
      secondaryLang: "vi"
    });

    assert.equal(pairs[1]?.alignment, "primary_only");
    assert.equal(pairs[1]?.secondary, null);
  });
});
