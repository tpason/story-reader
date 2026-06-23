"use client";

import { BookOpen, ChevronDown, ChevronUp, Flame, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StoryCover } from "@/components/StoryCover";
import { StoryRatingWidget } from "@/components/StoryRatingWidget";
import type { GlossaryCharacter } from "@/lib/reader-glossary";
import {
  buildSearchHighlightSegments,
  findChapterSearchMatches,
  isActiveChapterSearchMatch,
  type ChapterSearchMatch
} from "@/lib/reader-in-chapter-search";
import { streakBonusXp } from "@/lib/reading-streak";
import { useAppSelector } from "@/lib/store-hooks";
import { storyHref } from "@/lib/urls";

type RecommendationItem = {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  totalChapters: number;
  primaryCategoryName: string | null;
};

export function ReaderStatsPill({
  sessionMinutes,
  chapterProgress = 0,
  chapterMinutesLeft = 0
}: {
  sessionMinutes: number;
  chapterProgress?: number;
  chapterMinutesLeft?: number;
}) {
  const streak = useAppSelector((state) => state.readingStreak);
  const bonusXp = streakBonusXp(streak.currentStreak);

  if (sessionMinutes <= 0 && streak.currentStreak <= 0 && chapterProgress <= 0) {
    return (
      <div className="reader-stats-pill reader-stats-pill-idle" aria-label="Thống kê phiên đọc">
        <span>
          <BookOpen size={13} aria-hidden="true" />
          Đang đọc
        </span>
      </div>
    );
  }

  return (
    <div className="reader-stats-pill" aria-label="Thống kê phiên đọc">
      {chapterProgress > 0 ? (
        <span>
          <BookOpen size={13} aria-hidden="true" />
          {chapterProgress}%
          {chapterMinutesLeft > 0 ? ` · ~${chapterMinutesLeft}p` : ""}
        </span>
      ) : null}
      {sessionMinutes > 0 ? (
        <span>
          <BookOpen size={13} aria-hidden="true" />
          {sessionMinutes} phút
        </span>
      ) : null}
      {streak.currentStreak > 0 ? (
        <span>
          <Flame size={13} aria-hidden="true" />
          {streak.currentStreak} ngày
          {bonusXp > 0 ? ` · +${bonusXp} XP` : ""}
        </span>
      ) : null}
    </div>
  );
}

import type { StoryContentSearchHit } from "@/lib/reader-story-search";

type ReaderSearchMode = "chapter" | "story";

type ReaderInChapterSearchProps = {
  open: boolean;
  query: string;
  matchIndex: number;
  matchCount: number;
  mode?: ReaderSearchMode;
  storyHits?: StoryContentSearchHit[];
  storyHitIndex?: number;
  storyLoading?: boolean;
  storyError?: string | null;
  onQueryChange: (value: string) => void;
  onModeChange?: (mode: ReaderSearchMode) => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onStoryHitSelect?: (hit: StoryContentSearchHit) => void;
};

export function ReaderInChapterSearchPanel({
  open,
  query,
  matchIndex,
  matchCount,
  mode = "chapter",
  storyHits = [],
  storyHitIndex = 0,
  storyLoading = false,
  storyError = null,
  onQueryChange,
  onModeChange,
  onClose,
  onPrevious,
  onNext,
  onStoryHitSelect
}: ReaderInChapterSearchProps) {
  if (!open) return null;

  const storyMode = mode === "story";
  const activeStoryHit = storyHits[storyHitIndex] ?? null;

  return (
    <div className="reader-in-chapter-search-shell">
      <div className="reader-in-chapter-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          role="searchbox"
          value={query}
          placeholder={storyMode ? "Tìm trong truyện…" : "Tìm trong chương…"}
          aria-label={storyMode ? "Tìm trong truyện" : "Tìm trong chương"}
          autoFocus
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (storyMode && activeStoryHit) {
                onStoryHitSelect?.(activeStoryHit);
                return;
              }
              if (event.shiftKey) onPrevious();
              else onNext();
            }
            if (event.key === "Escape") onClose();
          }}
        />
        {onModeChange ? (
          <div className="reader-search-mode" role="tablist" aria-label="Phạm vi tìm kiếm">
            <button type="button" role="tab" aria-selected={!storyMode} className={!storyMode ? "reader-search-mode-active" : ""} onClick={() => onModeChange("chapter")}>
              Chương
            </button>
            <button type="button" role="tab" aria-selected={storyMode} className={storyMode ? "reader-search-mode-active" : ""} onClick={() => onModeChange("story")}>
              Truyện
            </button>
          </div>
        ) : null}
        <span className="reader-in-chapter-search-count" aria-live="polite">
          {storyMode
            ? storyLoading
              ? "…"
              : storyHits.length > 0
                ? `${storyHitIndex + 1}/${storyHits.length}`
                : query.trim().length >= 2
                  ? "0"
                  : "—"
            : matchCount > 0
              ? `${matchIndex + 1}/${matchCount}`
              : query.trim().length >= 2
                ? "0"
                : "—"}
        </span>
        <button type="button" className="reader-in-chapter-search-nav" aria-label="Kết quả trước" disabled={storyMode ? storyHits.length === 0 : matchCount === 0} onClick={onPrevious}>
          <ChevronUp size={16} />
        </button>
        <button type="button" className="reader-in-chapter-search-nav" aria-label="Kết quả sau" disabled={storyMode ? storyHits.length === 0 : matchCount === 0} onClick={onNext}>
          <ChevronDown size={16} />
        </button>
        <button type="button" className="reader-in-chapter-search-close" aria-label="Đóng tìm kiếm" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      {storyMode && query.trim().length >= 2 ? (
        <div className="reader-story-search-results" role="listbox" aria-label="Kết quả tìm trong truyện">
          {storyError ? <p className="reader-story-search-empty">{storyError}</p> : null}
          {!storyError && !storyLoading && storyHits.length === 0 ? (
            <p className="reader-story-search-empty">Không thấy đoạn phù hợp</p>
          ) : null}
          {storyHits.map((hit, index) => (
            <button
              key={`${hit.chapterNumber}-${hit.paragraphIndex}-${index}`}
              type="button"
              role="option"
              aria-selected={index === storyHitIndex}
              className={`reader-story-search-hit${index === storyHitIndex ? " reader-story-search-hit-active" : ""}`}
              onClick={() => onStoryHitSelect?.(hit)}
            >
              <strong>Ch.{hit.chapterNumber}</strong>
              <span>{hit.chapterTitle}</span>
              <small>{hit.excerpt}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function renderParagraphSearchText(
  text: string,
  query: string,
  activeMatch: ChapterSearchMatch | null,
  chapterNumber: number,
  paragraphIndex: number
) {
  if (!query.trim()) return text;

  const activeRange =
    isActiveChapterSearchMatch(activeMatch, chapterNumber, paragraphIndex)
      ? { start: activeMatch!.start, end: activeMatch!.end }
      : null;

  const segments = buildSearchHighlightSegments(text, query, activeRange);
  return segments.map((segment, index) =>
    segment.highlight ? (
      <mark key={`${chapterNumber}-${paragraphIndex}-${index}`} className={segment.active ? "reader-search-mark reader-search-mark-active" : "reader-search-mark"}>
        {segment.text}
      </mark>
    ) : (
      <span key={`${chapterNumber}-${paragraphIndex}-${index}`}>{segment.text}</span>
    )
  );
}

export function useChapterSearchMatches(paragraphs: string[], query: string) {
  return useMemo(() => findChapterSearchMatches(paragraphs, query), [paragraphs, query]);
}

type ReaderGlossaryDrawerProps = {
  open: boolean;
  characters: GlossaryCharacter[];
  onClose: () => void;
  onSelectCharacter?: (character: GlossaryCharacter) => void;
};

export function ReaderGlossaryDrawer({ open, characters, onClose, onSelectCharacter }: ReaderGlossaryDrawerProps) {
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!open) setFilter("");
  }, [open]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return characters;
    return characters.filter((character) => {
      const haystack = [character.name, character.role, character.pronouns3rd, character.personality]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [characters, filter]);

  if (!open) return null;

  return (
    <aside className="reader-glossary-drawer" aria-label="Nhân vật và thuật ngữ">
      <div className="reader-glossary-drawer-header">
        <div>
          <p className="eyebrow">Động phủ</p>
          <h2>Nhân vật & thuật ngữ</h2>
        </div>
        <button type="button" className="reader-glossary-drawer-close" aria-label="Đóng" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <input
        className="reader-glossary-drawer-search"
        type="search"
        placeholder="Lọc tên, vai trò…"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <div className="reader-glossary-drawer-list">
        {filtered.length === 0 ? (
          <p className="reader-glossary-drawer-empty">Chưa có char map cho truyện này.</p>
        ) : (
          filtered.map((character) => (
            <button
              key={character.name}
              type="button"
              className="reader-glossary-drawer-item"
              onClick={() => onSelectCharacter?.(character)}
            >
              <strong>{character.name}</strong>
              {character.role ? <span>{character.role}</span> : null}
              {character.pronouns3rd ? <small>{character.pronouns3rd}</small> : null}
              {character.personality ? <p>{character.personality}</p> : null}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

type ReaderChapterFooterProps = {
  storyId: string;
  excludeStoryId?: string;
};

export function ReaderChapterFooter({ storyId, excludeStoryId }: ReaderChapterFooterProps) {
  const user = useAppSelector((state) => state.identity.user);
  const hydrated = useAppSelector((state) => state.identity.hydrated);

  const { data } = useQuery<{ items: RecommendationItem[] }>({
    queryKey: ["reader-chapter-recommendations", user?.id ?? "guest"],
    queryFn: () => fetch("/api/reader/recommendations").then((response) => response.json()),
    enabled: hydrated && Boolean(user),
    staleTime: 5 * 60_000
  });

  const recommendations = (data?.items ?? []).filter((item) => item.id !== excludeStoryId).slice(0, 4);

  return (
    <section className="reader-chapter-footer" aria-label="Kết thúc chương">
      <StoryRatingWidget storyId={storyId} compact />

      {recommendations.length > 0 ? (
        <div className="reader-chapter-recommendations">
          <div className="reader-chapter-recommendations-heading">
            <Users size={16} aria-hidden="true" />
            <div>
              <p className="eyebrow">Tiếp tục hành trình</p>
              <h3>Linh quyển gợi ý</h3>
            </div>
          </div>
          <div className="reader-chapter-recommendations-row">
            {recommendations.map((story) => (
              <Link key={story.id} className="reader-chapter-recommendation-card" href={storyHref(story)}>
                <StoryCover src={story.coverImageUrl} title={story.title} />
                <div>
                  <strong>{story.title}</strong>
                  <small>
                    {story.primaryCategoryName ?? story.author ?? "Linh quyển"} · {story.totalChapters} ch
                  </small>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
