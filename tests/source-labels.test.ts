import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatRankBoardLabel, formatSourceLabel } from "../lib/source-labels.ts";

describe("source labels", () => {
  it("maps known crawl sources", () => {
    assert.equal(formatSourceLabel("truyenfull_today"), "TruyenFull");
    assert.equal(formatSourceLabel("royalroad"), "Royal Road");
  });

  it("humanizes unknown source codes", () => {
    assert.equal(formatSourceLabel("some_new_source"), "some new source");
  });

  it("formats board chips", () => {
    assert.equal(formatRankBoardLabel("truyenfull_today", "hot", 12), "TruyenFull · hot (12)");
  });
});
