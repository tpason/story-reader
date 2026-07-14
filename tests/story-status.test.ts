import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayStoryAuthor, resolveStoryStatusBadge } from "../lib/story-status.ts";

describe("resolveStoryStatusBadge", () => {
  it("prefers completed when flag or Full-like status", () => {
    assert.deepEqual(resolveStoryStatusBadge({ isCompleted: true, status: "Đang cập nhật" }), {
      completed: true,
      label: "Hoàn thành",
    });
    assert.deepEqual(resolveStoryStatusBadge({ isCompleted: false, status: "Full" }), {
      completed: true,
      label: "Hoàn thành",
    });
  });

  it("normalizes ongoing placeholders", () => {
    assert.deepEqual(resolveStoryStatusBadge({ isCompleted: false, status: null }), {
      completed: false,
      label: "Đang cập nhật",
    });
    assert.deepEqual(resolveStoryStatusBadge({ isCompleted: false, status: "Ongoing" }), {
      completed: false,
      label: "Đang cập nhật",
    });
  });

  it("keeps custom status text", () => {
    assert.deepEqual(resolveStoryStatusBadge({ isCompleted: false, status: "Tạm nghỉ" }), {
      completed: false,
      label: "Tạm nghỉ",
    });
  });
});

describe("displayStoryAuthor", () => {
  it("masks crawl placeholders", () => {
    assert.equal(displayStoryAuthor("Đang cập nhật"), "Vô danh tác giả");
    assert.equal(displayStoryAuthor(null), "Vô danh tác giả");
    assert.equal(displayStoryAuthor("Lãm Nguyệt"), "Lãm Nguyệt");
  });
});
