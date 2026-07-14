import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignParagraphGroups, buildBilingualParagraphPairs } from "../lib/reader-bilingual-pairs.ts";

describe("buildBilingualParagraphPairs", () => {
  it("aligns equal-count paragraphs 1-1", () => {
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

  it("merges short English paragraphs into one polished paragraph", () => {
    const pairs = buildBilingualParagraphPairs({
      primaryParagraphs: [
        "Ah.",
        "I opened my eyes.",
        "A familiar feeling.",
        '"Another regression, it seems."'
      ],
      secondaryParagraphs: [
        "À. Ta mở mắt ra. Một cảm giác quen thuộc.",
        '"Lại một lần hồi quy nữa, phải không?"'
      ],
      primaryLayer: "raw",
      secondaryLayer: "polished",
      primaryLang: "en",
      secondaryLang: "vi"
    });

    assert.ok(pairs.length >= 2);
    const firstMatched = pairs.find((pair) => pair.alignment === "matched" && pair.secondary?.text.includes("mở mắt"));
    assert.ok(firstMatched);
    assert.match(firstMatched!.primary.text, /opened my eyes/i);
    assert.match(firstMatched!.primary.text, /familiar feeling/i);
    assert.equal(firstMatched!.secondary?.text, "À. Ta mở mắt ra. Một cảm giác quen thuộc.");

    const dialogue = pairs.find((pair) => pair.secondary?.text.includes("hồi quy"));
    assert.ok(dialogue);
    assert.match(dialogue!.primary.text, /regression/i);
  });

  it("keeps primary-only rows when secondary is empty", () => {
    const pairs = buildBilingualParagraphPairs({
      primaryParagraphs: ["Only English."],
      secondaryParagraphs: [],
      primaryLayer: "raw",
      secondaryLayer: "polished",
      primaryLang: "en",
      secondaryLang: "vi"
    });

    assert.equal(pairs.length, 1);
    assert.equal(pairs[0]?.alignment, "primary_only");
    assert.equal(pairs[0]?.secondary, null);
  });
});

describe("alignParagraphGroups", () => {
  it("prefers 2-1 merge when lengths match better", () => {
    const groups = alignParagraphGroups(
      ["I opened my eyes.", "A familiar feeling."],
      ["À. Ta mở mắt ra. Một cảm giác quen thuộc."]
    );
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.primary.length, 2);
    assert.equal(groups[0]?.secondary.length, 1);
  });
});
