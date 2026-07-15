import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clipPairedText,
  clipPhrase,
  createPhraseNoteId,
  phraseNotesForStory,
  removePhraseNote,
  upsertPhraseNote,
  type ReaderPhraseNote
} from "../lib/reader-phrase-notes.ts";

function sample(partial: Partial<ReaderPhraseNote> = {}): ReaderPhraseNote {
  return {
    id: partial.id ?? "phrase-1",
    storyId: partial.storyId ?? "story-a",
    chapterId: partial.chapterId ?? "ch-1",
    chapterNumber: partial.chapterNumber ?? 1,
    chapterTitle: partial.chapterTitle ?? "One",
    paragraphIndex: partial.paragraphIndex ?? 0,
    phrase: partial.phrase ?? "spill the beans",
    pairedText: partial.pairedText ?? "để lộ bí mật",
    note: partial.note ?? null,
    createdAt: partial.createdAt ?? "2026-07-15T00:00:00.000Z"
  };
}

describe("reader-phrase-notes", () => {
  it("clips phrase whitespace and length", () => {
    assert.equal(clipPhrase("  hello   world  "), "hello world");
    assert.equal(clipPhrase("x".repeat(300)).length, 240);
    assert.equal(clipPairedText("  abc  "), "abc");
    assert.equal(clipPairedText(""), null);
  });

  it("upserts by story+chapter+paragraph+phrase key", () => {
    const first = sample({ id: "a", note: null, createdAt: "2026-07-15T01:00:00.000Z" });
    const updated = sample({ id: "b", note: "idiom", createdAt: "2026-07-15T02:00:00.000Z" });
    const next = upsertPhraseNote(upsertPhraseNote([], first), updated);
    assert.equal(next.length, 1);
    assert.equal(next[0]?.note, "idiom");
    assert.equal(next[0]?.id, "b");
  });

  it("removes by id and filters by story", () => {
    const a = sample({ id: "a", storyId: "s1" });
    const b = sample({ id: "b", storyId: "s2", phrase: "other" });
    const list = upsertPhraseNote(upsertPhraseNote([], a), b);
    assert.equal(phraseNotesForStory(list, "s1").length, 1);
    assert.equal(removePhraseNote(list, "a").length, 1);
  });

  it("creates stable-ish unique ids", () => {
    const id = createPhraseNoteId("story", 3, 2, "Piece of cake!");
    assert.match(id, /^phrase-story-3-2-/);
  });
});
