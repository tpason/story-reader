export type GlossaryCharacter = {
  name: string;
  gender: string | null;
  role: string | null;
  pronouns3rd: string | null;
  personality: string | null;
  speechStyle: string | null;
};

export type GlossaryIndex = Map<string, GlossaryCharacter>;

export function buildGlossaryIndex(
  characters: GlossaryCharacter[],
  aliases: Record<string, string>
): GlossaryIndex {
  const index: GlossaryIndex = new Map();

  for (const character of characters) {
    if (character.name) index.set(character.name.toLowerCase(), character);
  }

  for (const [alias, canonical] of Object.entries(aliases)) {
    const entry = index.get(canonical.toLowerCase()) ?? characters.find((item) => item.name === canonical);
    if (alias && entry) index.set(alias.toLowerCase(), entry);
  }

  return index;
}

export function lookupGlossarySelection(selectedText: string, index: GlossaryIndex) {
  const trimmed = selectedText.trim();
  if (!trimmed || index.size === 0) return null;

  const direct = index.get(trimmed.toLowerCase());
  if (direct) return direct;

  let best: GlossaryCharacter | null = null;
  let bestLength = 0;

  for (const [term, character] of index.entries()) {
    if (term.length < 2) continue;
    if (!trimmed.toLowerCase().includes(term)) continue;
    if (term.length > bestLength) {
      best = character;
      bestLength = term.length;
    }
  }

  return best;
}
