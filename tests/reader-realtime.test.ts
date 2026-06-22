import test from "node:test";
import assert from "node:assert/strict";
import { isReaderRealtimeEventType, READER_REALTIME_EVENT_TYPES } from "../lib/reader-realtime.ts";

test("isReaderRealtimeEventType accepts known event types", () => {
  for (const eventType of READER_REALTIME_EVENT_TYPES) {
    assert.equal(isReaderRealtimeEventType(eventType), true);
  }
  assert.equal(isReaderRealtimeEventType("connected"), false);
});
