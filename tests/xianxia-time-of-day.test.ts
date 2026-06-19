import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getClockTimeOfDay, resolveXianxiaTimeOfDay } from "../lib/xianxia-time-of-day.ts";

describe("getClockTimeOfDay", () => {
  it("maps hours to sky phases", () => {
    assert.equal(getClockTimeOfDay(new Date("2026-06-19T06:30:00")), "dawn");
    assert.equal(getClockTimeOfDay(new Date("2026-06-19T12:00:00")), "day");
    assert.equal(getClockTimeOfDay(new Date("2026-06-19T17:30:00")), "dusk");
    assert.equal(getClockTimeOfDay(new Date("2026-06-19T22:00:00")), "night");
  });
});

describe("resolveXianxiaTimeOfDay", () => {
  it("ignores UI theme and follows clock", () => {
    const atNoon = new Date("2026-06-19T12:00:00");
    assert.equal(resolveXianxiaTimeOfDay("dark", atNoon), "day");
    assert.equal(resolveXianxiaTimeOfDay("light", atNoon), "day");
  });
});
