import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSkillWebglActive, shouldRenderCssLayer } from "../lib/skill-visual.ts";

describe("isSkillWebglActive", () => {
  it("disables on mobile and reduced motion", () => {
    assert.equal(isSkillWebglActive(true, false, true), false);
    assert.equal(isSkillWebglActive(false, true, true), false);
  });

  it("enables on desktop when decorative webgl is on", () => {
    assert.equal(isSkillWebglActive(false, false, true), true);
    assert.equal(isSkillWebglActive(false, false, false), false);
  });
});

describe("shouldRenderCssLayer", () => {
  it("uses compact mobile layers only", () => {
    assert.equal(shouldRenderCssLayer("wind_blade", "wind", true, false), true);
    assert.equal(shouldRenderCssLayer("wind_blade", "particles", true, false), false);
    assert.equal(shouldRenderCssLayer("starfall", "meteors", true, false), true);
  });

  it("hides replaced layers when desktop webgl is active", () => {
    assert.equal(shouldRenderCssLayer("van_kiem", "creatures", false, true), false);
    assert.equal(shouldRenderCssLayer("van_kiem", "creatures", false, false), true);
  });
});
