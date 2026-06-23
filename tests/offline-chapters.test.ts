import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateOfflineCacheBytes,
  formatOfflineCacheSize,
  OFFLINE_DOWNLOAD_MAX,
  summarizeOfflineCacheByStory
} from "../lib/offline-chapters-utils.ts";

describe("offline chapters helpers", () => {
  it("formats cache size for display", () => {
    assert.equal(formatOfflineCacheSize(512), "512 B");
    assert.match(formatOfflineCacheSize(2048), /KB/);
    assert.match(formatOfflineCacheSize(2 * 1024 * 1024), /MB/);
  });

  it("estimates payload bytes", () => {
    const records = [
      {
        payload: { story: { id: "1", title: "T" }, chapter: { id: "c1", chapterNumber: 1, title: "C1", content: "abc" } }
      }
    ];
    assert.ok(estimateOfflineCacheBytes(records) > 20);
  });

  it("caps download max constant", () => {
    assert.equal(OFFLINE_DOWNLOAD_MAX, 20);
  });

  it("summarizes offline cache records by story", () => {
    const payload = { story: { id: "s1", title: "A" }, chapter: { chapterNumber: 1 } };
    const summaries = summarizeOfflineCacheByStory([
      { storyId: "s1", storyTitle: "Alpha", chapterNumber: 2, payload },
      { storyId: "s2", storyTitle: "Beta", chapterNumber: 1, payload },
      { storyId: "s1", storyTitle: "Alpha", chapterNumber: 5, payload }
    ]);
    assert.equal(summaries.length, 2);
    assert.equal(summaries[0]?.storyId, "s1");
    assert.equal(summaries[0]?.chapterCount, 2);
    assert.equal(summaries[0]?.minChapter, 2);
    assert.equal(summaries[0]?.maxChapter, 5);
  });
});
