import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
