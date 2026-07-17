import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatNovelContent, READER_CONTENT_FORMAT_VERSION } from "../lib/formatNovelContent.ts";

describe("formatNovelContent", () => {
  it("exports bumped format version for reader cache invalidation", () => {
    assert.equal(READER_CONTENT_FORMAT_VERSION, 8);
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

  it("rejoins soft-wrapped sentence fragments split by blank lines", () => {
    const content = `Một con

Đại Bằng

bằng gió xé trời lao xuống.

Uy lực pháp thuật ấy vượt xa hẳn thứ mà Thái tử

Makli Hyun

từng phô diễn!`;

    const paragraphs = formatNovelContent(content);
    assert.deepEqual(paragraphs, [
      "Một con Đại Bằng bằng gió xé trời lao xuống.",
      "Uy lực pháp thuật ấy vượt xa hẳn thứ mà Thái tử Makli Hyun từng phô diễn!",
    ]);
  });

  it("preserves finished short paragraphs the author separated", () => {
    const content = `Không thể né.

Phải đứng!

Két—!

Tôi mỉm cười.`;
    assert.deepEqual(formatNovelContent(content), [
      "Không thể né.",
      "Phải đứng!",
      "Két—!",
      "Tôi mỉm cười.",
    ]);
  });

  it("keeps dialogue breaks as separate paragraphs", () => {
    const paragraphs = formatNovelContent('Hắn mở mắt.\n\n"Ngươi đến rồi?"');
    assert.equal(paragraphs.length, 2);
    assert.equal(paragraphs[0], "Hắn mở mắt.");
    assert.equal(paragraphs[1], '"Ngươi đến rồi?"');
  });
});
