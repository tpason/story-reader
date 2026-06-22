import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSkillCastLabel, SKILL_ELEMENT_LABEL } from "../lib/skill-copy.ts";

describe("formatSkillCastLabel", () => {
  it("wraps skill name in guillemets with caster", () => {
    assert.equal(formatSkillCastLabel({ skillName: "Phong Nhận", username: "yuki" }), "「Phong Nhận」 — yuki");
  });

  it("includes realm when provided", () => {
    assert.match(
      formatSkillCastLabel({ skillName: "Hoán Vũ", username: "yuki", realm: "Luyện Khí kỳ" }),
      /Luyện Khí kỳ/
    );
  });
});

describe("SKILL_ELEMENT_LABEL", () => {
  it("maps core skills to ngũ hành labels", () => {
    assert.equal(SKILL_ELEMENT_LABEL.wind_blade, "Phong");
    assert.equal(SKILL_ELEMENT_LABEL.heaven_thunder, "Lôi");
    assert.equal(SKILL_ELEMENT_LABEL.thien_dia_an, "Ấn");
  });
});
