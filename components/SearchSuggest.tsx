"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StoryCover } from "@/components/StoryCover";
import type { CursorPage, StorySummary } from "@/lib/types";
import { storyHref } from "@/lib/urls";

type SearchSuggestProps = {
  defaultValue?: string;
  category?: string;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function SearchSuggest({ defaultValue, category }: SearchSuggestProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query.trim(), 280);
  const debouncedUrlQuery = useDebounce(query.trim(), 420);

  // Sync with server-driven defaultValue on navigation (App Router state preservation fix)
  useEffect(() => {
    setQuery(defaultValue ?? "");
    setOpen(false);
  }, [defaultValue]);

  // Keep URL in sync so homepage shows search results (not discovery rails).
  useEffect(() => {
    const nextQ = debouncedUrlQuery;
    const currentQ = (searchParams.get("q") ?? "").trim();
    if (nextQ === currentQ) return;

    const params = new URLSearchParams(searchParams.toString());
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    params.delete("page");
    router.replace(params.size ? `/?${params.toString()}` : "/", { scroll: false });
  }, [debouncedUrlQuery, router, searchParams]);

  const { data } = useQuery<CursorPage<StorySummary>>({
    queryKey: ["search-suggest", debouncedQuery, category],
    queryFn: async () => {
      const params = new URLSearchParams({ q: debouncedQuery, limit: "6" });
      if (category) params.set("category", category);
      const r = await fetch(`/api/stories?${params}`);
      if (!r.ok) throw new Error("Không tải được gợi ý");
      return r.json();
    },
    enabled: debouncedQuery.length > 1,
    staleTime: 60_000,
  });

  const suggestions = data?.items ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="search-suggest-wrap" ref={wrapRef}>
      <input
        ref={inputRef}
        className="search-input"
        name="q"
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { if (query.trim().length > 1) setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter") setOpen(false);
        }}
        placeholder="Tìm truyện hoặc tác giả..."
        aria-label="Tìm kiếm trong Thiên Thư"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-haspopup="listbox"
        aria-controls="search-suggest-listbox"
      />
      {query.length > 0 && (
        <button
          type="button"
          className="search-clear-btn"
          aria-label="Xóa tìm kiếm"
          onClick={() => {
            setQuery("");
            setOpen(false);
            inputRef.current?.focus();
          }}
        >
          <X size={14} />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <div className="search-suggest-dropdown" id="search-suggest-listbox" role="listbox" aria-label="Linh quyển tìm thấy">
          <div className="search-suggest-header">
            <span>Linh quyển phù hợp</span>
          </div>
          {suggestions.map((story) => (
            <Link
              key={story.id}
              className="search-suggest-item"
              href={storyHref(story)}
              role="option"
              onClick={() => setOpen(false)}
            >
              <div className="search-suggest-cover">
                <StoryCover src={story.coverImageUrl} title={story.title} />
              </div>
              <div className="search-suggest-item-body">
                <strong>{story.title}</strong>
                <small>
                  {story.author || "Vô danh tác giả"} · {story.totalChapters} chương
                  {story.primaryCategoryName ? ` · ${story.primaryCategoryName}` : ""}
                </small>
              </div>
              <Search size={12} className="search-suggest-icon" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
