import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isEnglishSourceStory, supportsBilingualReader } from "../lib/reader-source-language.ts";
import { bilingualFetchOptions, DEFAULT_BILINGUAL_PREFS, readReaderBilingualPrefs } from "../lib/reader-bilingual-prefs.ts";

describe("bilingual reader scope", () => {
  it("allows only english sources", () => {
    assert.equal(isEnglishSourceStory("royalroad"), true);
    assert.equal(isEnglishSourceStory("hako"), false);
    assert.equal(supportsBilingualReader("lightnovelpub"), true);
  });

  it("returns fetch options only when enabled", () => {
    assert.equal(bilingualFetchOptions(DEFAULT_BILINGUAL_PREFS), undefined);
    assert.deepEqual(bilingualFetchOptions({ ...DEFAULT_BILINGUAL_PREFS, enabled: true }), {
      primaryLayer: "raw",
      secondaryLayer: "polished",
      displayMode: "interleaved"
    });
    assert.equal(
      readReaderBilingualPrefs().scrollHighlight,
      DEFAULT_BILINGUAL_PREFS.scrollHighlight
    );
    assert.equal(DEFAULT_BILINGUAL_PREFS.layoutStyle, "stacked");
  });
});
