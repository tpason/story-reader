import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absolutizeAudioUrl,
  extractLookupContextSentence,
  normalizeLookupQuery,
  parseDictionaryPayload,
  parseMyMemoryPayload,
  primaryLemmaHint
} from "../lib/reader-lookup.ts";

describe("reader-lookup normalize", () => {
  it("trims punctuation and detects phrase", () => {
    assert.deepEqual(normalizeLookupQuery("  Bank,  "), { query: "Bank", kind: "word" });
    assert.deepEqual(normalizeLookupQuery("spill the beans!"), { query: "spill the beans", kind: "phrase" });
    assert.equal(normalizeLookupQuery("   "), null);
  });

  it("extracts lemma hint and absolutizes audio", () => {
    assert.equal(primaryLemmaHint("spill the beans"), "spill");
    assert.equal(absolutizeAudioUrl("//ssl.gstatic.com/x.mp3"), "https://ssl.gstatic.com/x.mp3");
    assert.equal(absolutizeAudioUrl("https://cdn.example/a.mp3"), "https://cdn.example/a.mp3");
    assert.equal(absolutizeAudioUrl(""), null);
  });
});

describe("reader-lookup parsers", () => {
  it("parses multi-sense dictionary payload and prefers US audio order", () => {
    const parsed = parseDictionaryPayload(
      [
        {
          word: "bank",
          phonetic: "/bæŋk/",
          phonetics: [
            { text: "/bæŋk/", audio: "https://example.com/bank-gb.mp3" },
            { text: "/bæŋk/", audio: "https://example.com/bank-us.mp3" }
          ],
          meanings: [
            {
              partOfSpeech: "noun",
              definitions: [
                { definition: "A financial institution.", example: "I went to the bank.", synonyms: ["lender"] },
                { definition: "The side of a river.", example: "Sit on the bank.", synonyms: [] }
              ]
            },
            {
              partOfSpeech: "verb",
              definitions: [{ definition: "To tilt an aircraft.", synonyms: [] }]
            }
          ],
          sourceUrls: ["https://en.wiktionary.org/wiki/bank"]
        }
      ],
      "bank"
    );

    assert.ok(parsed);
    assert.equal(parsed?.dictionaryFound, true);
    assert.equal(parsed?.word, "bank");
    assert.equal(parsed?.phonetics[0]?.accent, "us");
    assert.equal(parsed?.meanings.length, 2);
    assert.equal(parsed?.meanings[0]?.senses.length, 2);
    assert.equal(parsed?.meanings[0]?.senses[0]?.example, "I went to the bank.");
  });

  it("parses MyMemory gloss alternates", () => {
    const gloss = parseMyMemoryPayload({
      responseData: { translatedText: "ngân hàng" },
      matches: [
        { translation: "ngân hàng" },
        { translation: "bờ sông" },
        { translation: "đê" }
      ]
    });
    assert.equal(gloss.primary, "ngân hàng");
    assert.deepEqual(gloss.alternates, ["bờ sông", "đê"]);
    assert.equal(gloss.source, "mymemory");
  });

  it("tolerates malformed dictionary and MyMemory payloads", () => {
    assert.equal(parseDictionaryPayload(null, "bank"), null);
    assert.equal(parseDictionaryPayload([], "bank"), null);
    assert.equal(parseDictionaryPayload([{ word: "x", meanings: [] }], "x"), null);
    assert.deepEqual(parseMyMemoryPayload(null), { primary: null, alternates: [], source: "none" });
    assert.deepEqual(parseMyMemoryPayload({ responseData: { translatedText: "null" } }), {
      primary: null,
      alternates: [],
      source: "none"
    });
  });

  it("extracts the sentence containing the lookup needle", () => {
    const paragraph = "He walked to the river. Sit on the bank and wait. Then go home.";
    assert.equal(extractLookupContextSentence(paragraph, "bank"), "Sit on the bank and wait.");
    assert.ok(extractLookupContextSentence("No punctuation bank here", "bank")?.includes("bank"));
    assert.equal(extractLookupContextSentence("", "bank"), null);
  });
});
