import { NextResponse } from "next/server";
import {
  emptyLookupResult,
  normalizeLookupQuery,
  parseDictionaryPayload,
  parseMyMemoryPayload,
  primaryLemmaHint,
  type LookupKind,
  type ReaderLookupResult
} from "@/lib/reader-lookup";

export const dynamic = "force-dynamic";

const DICTIONARY_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";
const MYMEMORY_BASE = "https://api.mymemory.translated.net/get";
const FETCH_TIMEOUT_MS = 6500;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const CACHE_MAX = 240;

type CacheEntry = { expiresAt: number; value: ReaderLookupResult };
const lookupCache = new Map<string, CacheEntry>();

function readCache(key: string): ReaderLookupResult | null {
  const hit = lookupCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    lookupCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string, value: ReaderLookupResult) {
  if (lookupCache.size >= CACHE_MAX) {
    const oldest = lookupCache.keys().next().value;
    if (oldest) lookupCache.delete(oldest);
  }
  lookupCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 }
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDictionary(query: string) {
  const encoded = encodeURIComponent(query.toLowerCase());
  let payload = await fetchJson(`${DICTIONARY_BASE}/${encoded}`);
  let parsed = parseDictionaryPayload(payload, query);
  if (parsed) return parsed;

  const lemma = primaryLemmaHint(query);
  if (lemma && lemma !== query.toLowerCase()) {
    payload = await fetchJson(`${DICTIONARY_BASE}/${encodeURIComponent(lemma)}`);
    parsed = parseDictionaryPayload(payload, query);
    if (parsed) {
      const kind: LookupKind = /\s/.test(query) ? "phrase" : "word";
      return { ...parsed, query, kind };
    }
  }
  return null;
}

async function fetchViGloss(query: string) {
  const params = new URLSearchParams({
    q: query,
    langpair: "en|vi"
  });
  // Optional: MyMemory raises anonymous char/day quota when `de` email is set.
  const email = process.env.LOOKUP_MYMEMORY_EMAIL?.trim();
  if (email && email.includes("@")) params.set("de", email);
  const payload = await fetchJson(`${MYMEMORY_BASE}?${params.toString()}`);
  return parseMyMemoryPayload(payload);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const normalized = normalizeLookupQuery(searchParams.get("q") ?? "");
  if (!normalized) {
    return NextResponse.json({ error: "Missing or invalid q" }, { status: 400 });
  }

  const cacheKey = normalized.query.toLowerCase();
  const cached = readCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        "X-Lookup-Cache": "hit"
      }
    });
  }

  const [dictionary, vi] = await Promise.all([fetchDictionary(normalized.query), fetchViGloss(normalized.query)]);

  const result: ReaderLookupResult = dictionary
    ? { ...dictionary, vi }
    : emptyLookupResult(normalized.query, normalized.kind, vi);

  writeCache(cacheKey, result);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "X-Lookup-Cache": "miss"
    }
  });
}
