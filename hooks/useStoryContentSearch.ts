"use client";

import { useEffect, useState } from "react";
import type { StoryContentSearchHit } from "@/lib/reader-story-search";

export function useStoryContentSearch(storyId: string, query: string, enabled: boolean) {
  const [hits, setHits] = useState<StoryContentSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/stories/${storyId}/content-search?q=${encodeURIComponent(trimmed)}`)
        .then(async (response) => {
          const payload = (await response.json()) as { items?: StoryContentSearchHit[]; error?: string };
          if (!response.ok) throw new Error(payload.error ?? "Search failed");
          if (!cancelled) setHits(payload.items ?? []);
        })
        .catch((fetchError: unknown) => {
          if (!cancelled) {
            setHits([]);
            setError(fetchError instanceof Error ? fetchError.message : "Không tìm được");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, query, storyId]);

  return { hits, loading, error };
}
