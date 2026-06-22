import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSkillBloomConfig, getSkillWebglPalette, scaleSkillPalette } from "../lib/skill-webgl-palettes.ts";

describe("skill webgl palettes", () => {
  it("returns jade/gold palette for sword and van kiem skills", () => {
    assert.equal(getSkillWebglPalette("sword_flight").primary, "#2f8f72");
    assert.equal(getSkillWebglPalette("van_kiem").primary, "#c8962e");
  });

  it("scales particle counts for desktop spectacle", () => {
    const scaled = scaleSkillPalette(getSkillWebglPalette("wind_blade"));
    assert.ok(scaled.particleCount > getSkillWebglPalette("wind_blade").particleCount);
  });

  it("tunes bloom for sword skills", () => {
    const bloom = getSkillBloomConfig("van_kiem", 1.2);
    assert.ok(bloom.strength > 1);
    assert.equal(bloom.afterimage, 0.84);
    assert.equal(getSkillBloomConfig("thien_dia_an", 1).strength, 3.1 * 1.12);
  });
});
