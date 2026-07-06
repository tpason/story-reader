import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTrendingPeriod, TRENDING_PERIODS } from "../lib/trending-period.ts";

describe("trending period", () => {
  it("defaults to week", () => {
    assert.equal(parseTrendingPeriod(undefined), "week");
    assert.equal(parseTrendingPeriod("invalid"), "week");
  });

  it("accepts valid periods", () => {
    for (const period of TRENDING_PERIODS) {
      assert.equal(parseTrendingPeriod(period), period);
    }
  });
});
