import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjustNotificationItems,
  computeNotificationUnread,
  effectiveMaxReadForNotify
} from "../lib/notification-caught-up.ts";

const STORY_A = "00000000-0000-4000-8000-000000000001";
const STORY_B = "00000000-0000-4000-8000-000000000002";

describe("notification caught up", () => {
  it("hides story after caught-up watermark reaches total chapters", () => {
    const caughtUp = { [STORY_A]: 100 };
    const items = adjustNotificationItems(
      [
        {
          storyId: STORY_A,
          totalChapters: 100,
          maxReadChapterNumber: 50,
          unread: 50,
          nextChapter: 51
        }
      ],
      caughtUp
    );
    assert.equal(items.length, 0);
  });

  it("shows unread again when total chapters grow past watermark", () => {
    const caughtUp = { [STORY_B]: 100 };
    const unread = computeNotificationUnread(STORY_B, 101, 50, caughtUp);
    assert.equal(unread, 1);
    assert.equal(effectiveMaxReadForNotify(STORY_B, 50, caughtUp), 100);
  });
});
