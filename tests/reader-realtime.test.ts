import test from "node:test";
import assert from "node:assert/strict";
import { isReaderRealtimeEventType, READER_REALTIME_EVENT_TYPES } from "../lib/reader-realtime.ts";
import { parseReaderRealtimeEvent } from "../lib/reader-realtime-event.ts";

test("isReaderRealtimeEventType accepts known event types", () => {
  for (const eventType of READER_REALTIME_EVENT_TYPES) {
    assert.equal(isReaderRealtimeEventType(eventType), true);
  }
  assert.equal(isReaderRealtimeEventType("connected"), false);
});

test("parseReaderRealtimeEvent extracts chapter payload", () => {
  const parsed = parseReaderRealtimeEvent({
    type: "chapter_update",
    storyId: "abc",
    chapterNumber: 12
  });
  assert.equal(parsed.type, "chapter_update");
  assert.equal(parsed.storyId, "abc");
  assert.equal(parsed.chapterNumber, 12);
});
