import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSoftParticleTexture, seededNoise } from "../lib/skill-webgl-utils.ts";

describe("seededNoise", () => {
  it("returns stable values in 0..1", () => {
    const a = seededNoise(42);
    const b = seededNoise(42);
    assert.equal(a, b);
    assert.ok(a >= 0 && a < 1);
  });
});

describe("getSoftParticleTexture", () => {
  it("is safe without DOM (returns null in Node)", () => {
    assert.equal(getSoftParticleTexture(), null);
  });
});
