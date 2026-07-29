import assert from "node:assert/strict";
import test from "node:test";
import { isViewingStoryPath, shouldSuppressRealtimeToast } from "../lib/reader-realtime-toast.ts";

const storyId = "02ba1d1c-933a-4851-b17a-e8f11e7ee7b5";
const storyPath = `/stories/example-${storyId}`;
const chapterPath = `${storyPath}/chapters/12`;

test("isViewingStoryPath matches story detail and chapter reader", () => {
  assert.equal(isViewingStoryPath(storyPath, storyId), true);
  assert.equal(isViewingStoryPath(chapterPath, storyId), true);
  assert.equal(isViewingStoryPath("/", storyId), false);
  assert.equal(isViewingStoryPath(`/stories/other-${storyId.slice(0, 8)}/chapters/1`, storyId), false);
});

test("shouldSuppressRealtimeToast skips page-local and bell-only events", () => {
  assert.equal(
    shouldSuppressRealtimeToast({ type: "chapter_update", storyId }, chapterPath),
    true
  );
  assert.equal(
    shouldSuppressRealtimeToast({ type: "chapter_update", storyId }, storyPath),
    true
  );
  assert.equal(
    shouldSuppressRealtimeToast({ type: "chapter_update", storyId }, "/"),
    false
  );
  assert.equal(shouldSuppressRealtimeToast({ type: "notification_update", storyId }, "/"), true);
  assert.equal(
    shouldSuppressRealtimeToast({ type: "story_update", storyId }, chapterPath),
    true
  );
});
