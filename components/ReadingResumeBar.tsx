"use client";

import { BookOpenCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { writeResumeNavigationTarget } from "@/lib/reader-resume";
import { prefetchReaderChapterQuery } from "@/lib/reader-query";
import { warmReaderClientChunk } from "@/lib/warm-reader-client";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";

type ReadingResumeBarProps = {
  storyId?: string;
  /** Homepage: show compact recent-history chips under the singular CTA. */
  showRecentRail?: boolean;
};

export function ReadingResumeBar({ storyId, showRecentRail = false }: ReadingResumeBarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const items = useAppSelector((state) => state.history.items);
  const hydrated = useAppSelector((state) => state.history.hydrated);
  const { isFresh } = useFreshStoryRealtime();

  const sorted = useMemo(
    () => [...items].sort((a, b) => Date.parse(b.lastReadAt) - Date.parse(a.lastReadAt)),
    [items],
  );

  const latest = useMemo(() => {
    if (storyId) return sorted.find((item) => item.storyId === storyId) ?? null;
    return sorted[0] ?? null;
  }, [sorted, storyId]);

  const recentOthers = useMemo(() => {
    if (!showRecentRail || !latest) return [];
    return sorted.filter((item) => item.storyId !== latest.storyId).slice(0, 5);
  }, [showRecentRail, latest, sorted]);

  if (!latest) {
    // Reserve height until Redux hydrate — avoid homepage jump (no StoryLibrary skeleton).
    if (!hydrated) return <div className="resume-mini-bar resume-mini-bar--slot" aria-hidden="true" />;
    return null;
  }

  const href = storyHref({ id: latest.storyId, title: latest.storyTitle }, latest.chapterNumber);
  const paragraphLabel =
    latest.paragraphIndex != null && latest.paragraphIndex > 0
      ? ` · đoạn ${latest.paragraphIndex + 1}`
      : "";

  function warmChapterNav(storyIdToWarm: string, chapterNumber: number, targetHref: string) {
    warmReaderClientChunk();
    router.prefetch(targetHref);
    void prefetchReaderChapterQuery(queryClient, storyIdToWarm, chapterNumber);
  }

  const primary = (
    <Link
      className="resume-mini-bar"
      href={href}
      onMouseEnter={() => warmChapterNav(latest.storyId, latest.chapterNumber, href)}
      onFocus={() => warmChapterNav(latest.storyId, latest.chapterNumber, href)}
      onClick={() =>
        writeResumeNavigationTarget(latest.storyId, latest.chapterNumber, {
          scrollPosition: latest.scrollPosition,
          paragraphIndex: latest.paragraphIndex ?? null
        })
      }
    >
      <BookOpenCheck size={16} />
      <span>
        <strong>Đọc tiếp: {latest.storyTitle}</strong>
        <small>
          Chương {latest.chapterNumber}
          {paragraphLabel} · {Math.round(latest.progressPercent)}%
        </small>
      </span>
      <ChevronRight size={16} />
    </Link>
  );

  if (!showRecentRail) return primary;

  return (
    <div className="home-personal-strip home-personal-strip--with-rail">
      {primary}
      {recentOthers.length > 0 ? (
        <div className="home-recent-rail" aria-label="Đọc gần đây">
          {recentOthers.map((item) => {
            const chipHref = storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber);
            return (
              <Link
                key={item.storyId}
                className={`home-recent-chip${isFresh(item.storyId) ? " home-recent-chip-fresh" : ""}`}
                href={chipHref}
                onMouseEnter={() => warmChapterNav(item.storyId, item.chapterNumber, chipHref)}
                onFocus={() => warmChapterNav(item.storyId, item.chapterNumber, chipHref)}
                onClick={() =>
                  writeResumeNavigationTarget(item.storyId, item.chapterNumber, {
                    scrollPosition: item.scrollPosition,
                    paragraphIndex: item.paragraphIndex ?? null
                  })
                }
              >
                <span className="home-recent-chip-title">{item.storyTitle}</span>
                <small className="home-recent-chip-ch">{`Ch.\u00A0${item.chapterNumber}`}</small>
              </Link>
            );
          })}
          <Link className="home-recent-more" href="/reading-history">
            Tàng thư
          </Link>
        </div>
      ) : null}
    </div>
  );
}
