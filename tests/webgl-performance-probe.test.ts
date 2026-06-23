import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyFrameSamples } from "../lib/webgl-performance-classify.ts";

describe("webgl performance probe", () => {
  it("marks smooth frames as strong", () => {
    const frames = Array.from({ length: 24 }, () => 16);
    assert.equal(classifyFrameSamples(frames), "strong");
  });

  it("marks sustained slow frames as weak", () => {
    const frames = Array.from({ length: 24 }, () => 40);
    assert.equal(classifyFrameSamples(frames), "weak");
  });

  it("marks hitch-heavy frames as weak even when average is ok", () => {
    const frames = [...Array.from({ length: 20 }, () => 18), 70, 68, 72, 66];
    assert.equal(classifyFrameSamples(frames), "weak");
  });

  it("requires minimum sample count", () => {
    assert.equal(classifyFrameSamples([16, 16, 16]), "weak");
  });
});
