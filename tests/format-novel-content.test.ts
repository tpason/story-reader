import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatNovelContent, READER_CONTENT_FORMAT_VERSION } from "../lib/formatNovelContent.ts";

describe("formatNovelContent", () => {
  it("exports bumped format version for reader cache invalidation", () => {
    assert.equal(READER_CONTENT_FORMAT_VERSION, 6);
  });

  it("rejoins parenthetical annotations split by blank lines inside dialogue", () => {
    const content = `"Vượt qua Tu sĩ (

Việt Tu

), vượt qua khuôn khổ võ học (

Việt Võ

) để đạt tới (

Lục

)!"`;

    const paragraphs = formatNovelContent(content);
    assert.equal(paragraphs.length, 1);
    assert.equal(
      paragraphs[0],
      '"Vượt qua Tu sĩ (Việt Tu), vượt qua khuôn khổ võ học (Việt Võ) để đạt tới (Lục)!"'
    );
  });

  it("merges short narrative paragraphs across blank lines", () => {
    const paragraphs = formatNovelContent("He opened his eyes.\n\nThe room was silent.");
    assert.equal(paragraphs.length, 1);
    assert.equal(paragraphs[0], "He opened his eyes. The room was silent.");
  });

  it("keeps dialogue breaks as separate paragraphs", () => {
    const paragraphs = formatNovelContent('Hắn mở mắt.\n\n"Ngươi đến rồi?"');
    assert.equal(paragraphs.length, 2);
    assert.equal(paragraphs[0], "Hắn mở mắt.");
    assert.equal(paragraphs[1], '"Ngươi đến rồi?"');
  });
});
