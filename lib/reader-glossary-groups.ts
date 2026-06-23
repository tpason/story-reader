import type { GlossaryCharacter } from "@/lib/reader-glossary";

export type GlossaryLetterGroup = {
  letter: string;
  characters: GlossaryCharacter[];
};

function glossarySortLetter(name: string) {
  const first = name.trim().charAt(0);
  if (!first) return "#";
  const upper = first.toUpperCase();
  if (/[A-ZÀ-Ỹ]/.test(upper)) return upper;
  if (/[0-9]/.test(first)) return "#";
  return "#";
}

export function groupGlossaryCharacters(characters: GlossaryCharacter[]): GlossaryLetterGroup[] {
  const buckets = new Map<string, GlossaryCharacter[]>();

  for (const character of characters) {
    const letter = glossarySortLetter(character.name);
    const list = buckets.get(letter) ?? [];
    list.push(character);
    buckets.set(letter, list);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => {
      if (left === "#") return 1;
      if (right === "#") return -1;
      return left.localeCompare(right, "vi");
    })
    .map(([letter, items]) => ({
      letter,
      characters: items.sort((left, right) => left.name.localeCompare(right.name, "vi"))
    }));
}

export function filterGlossaryCharacters(characters: GlossaryCharacter[], filter: string) {
  const needle = filter.trim().toLowerCase();
  if (!needle) return characters;
  return characters.filter((character) => {
    const haystack = [character.name, character.role, character.pronouns3rd, character.personality, character.speechStyle]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}
