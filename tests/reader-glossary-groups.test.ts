import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterGlossaryCharacters, groupGlossaryCharacters } from "../lib/reader-glossary-groups.ts";
import type { GlossaryCharacter } from "../lib/reader-glossary.ts";

const SAMPLE: GlossaryCharacter[] = [
  { name: "Enkrid", gender: "male", role: "Hiệp sĩ", pronouns3rd: "anh ta", personality: null, speechStyle: null },
  { name: "Shinar", gender: "female", role: "Tiên tộc", pronouns3rd: "cô ta", personality: null, speechStyle: null },
  { name: "Luagarne", gender: "female", role: "Thương nhân", pronouns3rd: "bà ta", personality: null, speechStyle: null }
];

describe("reader glossary groups", () => {
  it("groups characters by first letter", () => {
    const groups = groupGlossaryCharacters(SAMPLE);
    assert.equal(groups.length, 3);
    assert.equal(groups[0]?.letter, "E");
    assert.equal(groups[1]?.letter, "L");
    assert.equal(groups[2]?.letter, "S");
  });

  it("filters by role and name", () => {
    const filtered = filterGlossaryCharacters(SAMPLE, "tiên");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.name, "Shinar");
  });
});
