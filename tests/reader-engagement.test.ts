import assert from "node:assert/strict";
import test from "node:test";
import { readerEngagementDismissKey, READER_ENGAGE_MIN_CHAPTER } from "../lib/reader-engagement.ts";

test("readerEngagementDismissKey is stable per story", () => {
  const id = "02ba1d1c-933a-4851-b17a-e8f11e7ee7b5";
  assert.equal(readerEngagementDismissKey(id), `reader-engage-dismiss:${id}`);
});

test("READER_ENGAGE_MIN_CHAPTER is at least 2", () => {
  assert.ok(READER_ENGAGE_MIN_CHAPTER >= 2);
});
