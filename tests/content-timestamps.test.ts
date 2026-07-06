import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chapterTimestampLabel,
  formatChapterTimestamp,
  formatContentDate,
  formatRelativeActivity,
  formatStoryUpdatedLabel
} from "../lib/content-timestamps.ts";

test("chapterTimestampLabel follows content layer", () => {
  assert.equal(chapterTimestampLabel("raw"), "Tạo");
  assert.equal(chapterTimestampLabel(null), "Tạo");
  assert.equal(chapterTimestampLabel("translated"), "Cập nhật");
  assert.equal(chapterTimestampLabel("polished"), "Cập nhật");
});

test("formatChapterTimestamp renders Vietnamese date label", () => {
  const value = formatChapterTimestamp({
    textSource: "polished",
    updatedAt: "2026-07-06T08:30:00.000Z"
  });
  assert.ok(value?.startsWith("Cập nhật "));
  assert.ok(formatContentDate("2026-07-06T08:30:00.000Z"));
});

test("formatStoryUpdatedLabel prefixes update copy", () => {
  assert.match(formatStoryUpdatedLabel("2026-01-15T00:00:00.000Z") ?? "", /^Cập nhật /);
});

test("formatRelativeActivity returns humanized recent labels", () => {
  const recent = new Date(Date.now() - 5 * 60_000).toISOString();
  assert.equal(formatRelativeActivity(recent), "5 phút trước");
});
