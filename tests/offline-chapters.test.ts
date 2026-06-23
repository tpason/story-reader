import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estimateOfflineCacheBytes,
  formatOfflineCacheSize,
  OFFLINE_DOWNLOAD_MAX
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
});
