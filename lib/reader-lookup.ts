export type LookupKind = "word" | "phrase";

export type LookupPhonetic = {
  text: string | null;
  audioUrl: string | null;
  accent?: "us" | "uk" | "other";
};

export type LookupSense = {
  definition: string;
  example: string | null;
  synonyms: string[];
};

export type LookupMeaning = {
  partOfSpeech: string;
  senses: LookupSense[];
};

export type LookupViGloss = {
  primary: string | null;
  alternates: string[];
  source: "mymemory" | "none";
};

export type ReaderLookupResult = {
  query: string;
  kind: LookupKind;
  /** Dictionary headword when found; else normalized query. */
  word: string;
  phonetics: LookupPhonetic[];
  meanings: LookupMeaning[];
  vi: LookupViGloss;
  sourceUrls: string[];
  dictionaryFound: boolean;
};

export const MAX_LOOKUP_QUERY_LENGTH = 64;
export const MAX_LOOKUP_MEANINGS = 4;
export const MAX_LOOKUP_SENSES_PER_MEANING = 4;
export const MAX_LOOKUP_SYNONYMS = 6;
export const MAX_LOOKUP_VI_ALTERNATES = 4;

const EDGE_PUNCT_RE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

export function normalizeLookupQuery(raw: string): { query: string; kind: LookupKind } | null {
  const trimmed = raw.replace(/\s+/g, " ").trim().slice(0, MAX_LOOKUP_QUERY_LENGTH);
  if (!trimmed) return null;
  const query = trimmed.replace(EDGE_PUNCT_RE, "").trim();
  if (!query || query.length < 1) return null;
  const kind: LookupKind = /\s/.test(query) ? "phrase" : "word";
  return { query, kind };
}

/** First alphabetic token useful when phrase dictionary miss. */
export function primaryLemmaHint(query: string): string | null {
  const match = query.match(/[\p{L}][\p{L}'-]*/u);
  return match?.[0]?.toLowerCase() ?? null;
}

export function absolutizeAudioUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return null;
}

function detectAccent(audioUrl: string | null, text: string | null): LookupPhonetic["accent"] {
  const hay = `${audioUrl ?? ""} ${text ?? ""}`.toLowerCase();
  if (hay.includes("-us") || hay.includes("_us") || hay.includes("us.mp3")) return "us";
  if (hay.includes("-gb") || hay.includes("_gb") || hay.includes("uk") || hay.includes("gb.mp3")) return "uk";
  return "other";
}

type FreeDictionaryDefinition = {
  definition?: string;
  example?: string;
  synonyms?: string[];
};

type FreeDictionaryMeaning = {
  partOfSpeech?: string;
  definitions?: FreeDictionaryDefinition[];
};

type FreeDictionaryPhonetic = {
  text?: string;
  audio?: string;
};

type FreeDictionaryEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: FreeDictionaryPhonetic[];
  meanings?: FreeDictionaryMeaning[];
  sourceUrls?: string[];
};

export function parseDictionaryPayload(payload: unknown, fallbackQuery: string): Omit<ReaderLookupResult, "vi"> | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const entry = payload[0] as FreeDictionaryEntry;
  if (!entry || typeof entry !== "object") return null;

  const word = typeof entry.word === "string" && entry.word.trim() ? entry.word.trim() : fallbackQuery;
  const phonetics: LookupPhonetic[] = [];
  const seenAudio = new Set<string>();

  for (const item of entry.phonetics ?? []) {
    const text = typeof item.text === "string" && item.text.trim() ? item.text.trim() : null;
    const audioUrl = absolutizeAudioUrl(item.audio);
    if (!text && !audioUrl) continue;
    const key = audioUrl ?? `t:${text}`;
    if (seenAudio.has(key)) continue;
    seenAudio.add(key);
    phonetics.push({ text, audioUrl, accent: detectAccent(audioUrl, text) });
  }

  if (phonetics.length === 0 && typeof entry.phonetic === "string" && entry.phonetic.trim()) {
    phonetics.push({ text: entry.phonetic.trim(), audioUrl: null, accent: "other" });
  }

  // Prefer US audio first for play button ordering.
  phonetics.sort((a, b) => {
    const rank = (accent: LookupPhonetic["accent"]) => (accent === "us" ? 0 : accent === "uk" ? 1 : 2);
    return rank(a.accent) - rank(b.accent);
  });

  const meanings: LookupMeaning[] = [];
  for (const meaning of entry.meanings ?? []) {
    if (meanings.length >= MAX_LOOKUP_MEANINGS) break;
    const partOfSpeech = typeof meaning.partOfSpeech === "string" && meaning.partOfSpeech.trim() ? meaning.partOfSpeech.trim() : "other";
    const senses: LookupSense[] = [];
    for (const def of meaning.definitions ?? []) {
      if (senses.length >= MAX_LOOKUP_SENSES_PER_MEANING) break;
      const definition = typeof def.definition === "string" ? def.definition.trim() : "";
      if (!definition) continue;
      const synonyms = Array.isArray(def.synonyms)
        ? def.synonyms.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()).slice(0, MAX_LOOKUP_SYNONYMS)
        : [];
      senses.push({
        definition,
        example: typeof def.example === "string" && def.example.trim() ? def.example.trim() : null,
        synonyms
      });
    }
    if (senses.length > 0) meanings.push({ partOfSpeech, senses });
  }

  if (meanings.length === 0) return null;

  const sourceUrls = Array.isArray(entry.sourceUrls)
    ? entry.sourceUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//.test(url)).slice(0, 3)
    : [];

  const kind: LookupKind = /\s/.test(fallbackQuery) ? "phrase" : "word";

  return {
    query: fallbackQuery,
    kind,
    word,
    phonetics,
    meanings,
    sourceUrls,
    dictionaryFound: true
  };
}

type MyMemoryMatch = {
  translation?: string;
  quality?: string | number;
};

type MyMemoryResponse = {
  responseData?: { translatedText?: string };
  matches?: MyMemoryMatch[];
};

export function parseMyMemoryPayload(payload: unknown): LookupViGloss {
  if (!payload || typeof payload !== "object") {
    return { primary: null, alternates: [], source: "none" };
  }
  const data = payload as MyMemoryResponse;
  const primaryRaw = data.responseData?.translatedText?.trim() ?? "";
  const primary = primaryRaw && primaryRaw.toLowerCase() !== "null" ? primaryRaw : null;
  const alternates: string[] = [];
  const seen = new Set<string>();
  if (primary) seen.add(primary.toLowerCase());

  for (const match of data.matches ?? []) {
    const text = typeof match.translation === "string" ? match.translation.trim() : "";
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    alternates.push(text);
    if (alternates.length >= MAX_LOOKUP_VI_ALTERNATES) break;
  }

  if (!primary && alternates.length === 0) {
    return { primary: null, alternates: [], source: "none" };
  }

  return {
    primary: primary ?? alternates[0] ?? null,
    alternates: primary ? alternates : alternates.slice(1),
    source: "mymemory"
  };
}

export function emptyLookupResult(query: string, kind: LookupKind, vi: LookupViGloss = { primary: null, alternates: [], source: "none" }): ReaderLookupResult {
  return {
    query,
    kind,
    word: query,
    phonetics: [],
    meanings: [],
    vi,
    sourceUrls: [],
    dictionaryFound: false
  };
}

export function speakEnglishText(text: string, locale: "en-US" | "en-GB" = "en-US"): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;
  const synth = window.speechSynthesis;
  if (!synth) return false;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text.trim());
  utter.lang = locale;
  utter.rate = 0.92;
  const voices = synth.getVoices();
  const preferred = voices.find((voice) => voice.lang.toLowerCase().startsWith(locale.toLowerCase()));
  if (preferred) utter.voice = preferred;
  synth.speak(utter);
  return true;
}

/**
 * Extract the sentence containing `needle` from paragraph text (Readlang/LingQ context strip).
 * Falls back to a ±120 char window, then the full paragraph clipped.
 */
export function extractLookupContextSentence(paragraph: string, needle: string, maxLength = 280): string | null {
  const source = paragraph.replace(/\s+/g, " ").trim();
  const query = needle.replace(/\s+/g, " ").trim();
  if (!source || !query) return null;

  const lowerSource = source.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const at = lowerSource.indexOf(lowerQuery);
  if (at < 0) {
    return source.length <= maxLength ? source : `${source.slice(0, maxLength - 1)}…`;
  }

  const boundary = /[.!?\u2026\u3002]/;
  let start = 0;
  for (let i = at - 1; i >= 0; i -= 1) {
    if (boundary.test(source[i] ?? "")) {
      start = i + 1;
      break;
    }
  }
  let end = source.length;
  for (let i = at + query.length; i < source.length; i += 1) {
    if (boundary.test(source[i] ?? "")) {
      end = i + 1;
      break;
    }
  }

  let sentence = source.slice(start, end).trim();
  if (!sentence) {
    const windowStart = Math.max(0, at - 80);
    const windowEnd = Math.min(source.length, at + query.length + 120);
    sentence = source.slice(windowStart, windowEnd).trim();
  }
  if (sentence.length > maxLength) {
    const localAt = sentence.toLowerCase().indexOf(lowerQuery);
    if (localAt >= 0) {
      const left = Math.max(0, localAt - Math.floor(maxLength / 3));
      sentence = `${left > 0 ? "…" : ""}${sentence.slice(left, left + maxLength - 1).trim()}${left + maxLength < sentence.length ? "…" : ""}`;
    } else {
      sentence = `${sentence.slice(0, maxLength - 1)}…`;
    }
  }
  return sentence || null;
}
