import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildParagraphProgressWeights,
  computeFileModeProgress,
  computeSegmentModeProgress,
  paragraphIndexForAudioProgress
} from "../lib/reader-audio-sync.ts";

describe("reader audio sync", () => {
  it("maps progress ratio to paragraph index by word weights", () => {
    const weights = buildParagraphProgressWeights(["one two three", "four"]);
    assert.equal(paragraphIndexForAudioProgress(weights, 0), 0);
    assert.equal(paragraphIndexForAudioProgress(weights, 0.5), 0);
    assert.equal(paragraphIndexForAudioProgress(weights, 0.95), 1);
  });

  it("computes file mode progress from current time", () => {
    assert.equal(computeFileModeProgress(30, 120), 0.25);
    assert.equal(computeFileModeProgress(0, 0), 0);
  });

  it("computes segment mode progress across durations", () => {
    const segments = [{ durationSeconds: 10 }, { durationSeconds: 30 }];
    assert.equal(computeSegmentModeProgress(segments, 1, 15), 0.625);
    assert.equal(computeSegmentModeProgress(segments, 0, 5), 0.125);
  });
});
