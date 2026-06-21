import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeStreakFromReadDates, streakBonusXp } from "../lib/reading-streak.ts";

describe("reading streak xp", () => {
  it("computes streak from read dates", () => {
    const streak = computeStreakFromReadDates(["2026-06-19", "2026-06-18", "2026-06-17", "2026-06-15"]);
    assert.equal(streak.currentStreak, 3);
    assert.equal(streak.bestStreak, 3);
    assert.equal(streak.lastReadDate, "2026-06-19");
  });

  it("adds milestone bonus xp for long streaks", () => {
    assert.equal(streakBonusXp(0), 0);
    assert.equal(streakBonusXp(3), 45);
    assert.equal(streakBonusXp(7), 7 * 15 + 100);
    assert.equal(streakBonusXp(30), 30 * 15 + 100 + 500);
  });
});
