export type ReaderPhraseNote = {
  id: string;
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  paragraphIndex: number;
  /** Selected EN (or primary) phrase / sentence. */
  phrase: string;
  /** Paired secondary (often VI) paragraph excerpt when bilingual, else null. */
  pairedText: string | null;
  note: string | null;
  createdAt: string;
  updatedAt?: string;
};

export const READER_PHRASE_NOTES_KEY = "reader:phrase-notes";
export const MAX_PHRASE_NOTES = 200;
export const MAX_PHRASE_LENGTH = 240;
export const MAX_PAIRED_TEXT_LENGTH = 320;
export const MAX_PHRASE_NOTE_LENGTH = 500;

function phraseKey(note: Pick<ReaderPhraseNote, "storyId" | "chapterNumber" | "paragraphIndex" | "phrase">) {
  return `${note.storyId}:${note.chapterNumber}:${note.paragraphIndex}:${note.phrase.trim().toLowerCase()}`;
}

export function clipPhrase(text: string, max = MAX_PHRASE_LENGTH) {
  return text.trim().replace(/\s+/g, " ").slice(0, max);
}

export function clipPairedText(text: string | null | undefined, max = MAX_PAIRED_TEXT_LENGTH) {
  if (!text) return null;
  const clipped = text.trim().replace(/\s+/g, " ").slice(0, max);
  return clipped || null;
}

export function readPhraseNotes(): ReaderPhraseNote[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(READER_PHRASE_NOTES_KEY) ?? "[]") as ReaderPhraseNote[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (note) =>
          note?.storyId &&
          note?.chapterId &&
          typeof note.phrase === "string" &&
          note.phrase.trim() &&
          Number.isInteger(note.paragraphIndex) &&
          Number.isInteger(note.chapterNumber)
      )
      .map((note) => ({
        ...note,
        phrase: clipPhrase(note.phrase),
        pairedText: clipPairedText(note.pairedText),
        note: note.note?.trim() ? note.note.trim().slice(0, MAX_PHRASE_NOTE_LENGTH) : null
      }))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, MAX_PHRASE_NOTES);
  } catch {
    return [];
  }
}

export function writePhraseNotes(notes: ReaderPhraseNote[]) {
  if (typeof window === "undefined") return;
  const normalized = notes.map(normalizePhraseNote).filter((note) => note.phrase);
  window.localStorage.setItem(READER_PHRASE_NOTES_KEY, JSON.stringify(normalized.slice(0, MAX_PHRASE_NOTES)));
}

export function normalizePhraseNote(note: ReaderPhraseNote): ReaderPhraseNote {
  return {
    ...note,
    phrase: clipPhrase(note.phrase),
    pairedText: clipPairedText(note.pairedText),
    note: note.note?.trim() ? note.note.trim().slice(0, MAX_PHRASE_NOTE_LENGTH) : null
  };
}

export function upsertPhraseNote(notes: ReaderPhraseNote[], note: ReaderPhraseNote) {
  const normalized = normalizePhraseNote(note);
  if (!normalized.phrase) return notes;
  const key = phraseKey(normalized);
  return [normalized, ...notes.filter((item) => phraseKey(item) !== key)].slice(0, MAX_PHRASE_NOTES);
}

export function removePhraseNote(notes: ReaderPhraseNote[], id: string) {
  return notes.filter((item) => item.id !== id);
}

export function phraseNotesForStory(notes: ReaderPhraseNote[], storyId: string) {
  return notes
    .filter((note) => note.storyId === storyId)
    .sort((left, right) => {
      if (left.chapterNumber !== right.chapterNumber) return left.chapterNumber - right.chapterNumber;
      if (left.paragraphIndex !== right.paragraphIndex) return left.paragraphIndex - right.paragraphIndex;
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
}

export function createPhraseNoteId(storyId: string, chapterNumber: number, paragraphIndex: number, phrase: string) {
  const slug = clipPhrase(phrase, 48).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi, "-").replace(/^-|-$/g, "");
  return `phrase-${storyId}-${chapterNumber}-${paragraphIndex}-${slug || "x"}-${Date.now().toString(36)}`;
}
