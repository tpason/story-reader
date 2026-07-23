import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isUsefulStoryDescription,
  storyDisplayDescription,
} from "../lib/story-description.ts";
import { truncateMetaDescription } from "../lib/seo-text.ts";
import { storyKey } from "../lib/urls.ts";

describe("truncateMetaDescription", () => {
  it("trims long text", () => {
    const long = "a".repeat(200);
    assert.equal(truncateMetaDescription(long).length, 160);
    assert.match(truncateMetaDescription(long), /…$/);
  });
});

describe("storyKey", () => {
  it("builds stable slug-id path segment", () => {
    const key = storyKey({
      id: "11111111-1111-1111-1111-111111111111",
      title: "Tu Tiên Bá Đạo",
    });
    assert.equal(key, "tu-tien-ba-dao-11111111-1111-1111-1111-111111111111");
  });
});

describe("isUsefulStoryDescription", () => {
  it("rejects title + author crawl junk", () => {
    assert.equal(
      isUsefulStoryDescription(
        "Tôi Trói Định Hệ Thống Chống Gian Lận Khuyết Danh",
        "Tôi Trói Định Hệ Thống Chống Gian Lận",
        "Khuyết Danh",
      ),
      false,
    );
    assert.equal(
      isUsefulStoryDescription("Tu Tiên Bá Đạo", "Tu Tiên Bá Đạo", "A"),
      false,
    );
  });

  it("keeps real synopsis text", () => {
    assert.equal(
      isUsefulStoryDescription(
        "Một đệ tử phàm nhân bước vào con đường tu tiên đầy hiểm nguy.",
        "Tu Tiên Bá Đạo",
        "Khuyết Danh",
      ),
      true,
    );
  });
});

describe("storyDisplayDescription", () => {
  it("falls back when description is title+author", () => {
    const text = storyDisplayDescription({
      title: "Tu Tiên Bá Đạo",
      author: "Khuyết Danh",
      description: "Tu Tiên Bá Đạo Khuyết Danh",
      primaryCategoryName: "Tiên Hiệp",
      category: null,
      status: null,
      totalChapters: 120,
      isCompleted: false,
    });
    assert.match(text, /Tiên Hiệp/);
    assert.match(text, /120 chương/);
    assert.doesNotMatch(text, /^Tu Tiên Bá Đạo Khuyết Danh$/);
  });
});
