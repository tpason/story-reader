"use client";

import { BookOpenCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { writeResumeNavigationTarget } from "@/lib/reader-resume";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

export function ReadingResumeBar({ storyId }: { storyId?: string }) {
  const items = useAppSelector((state) => state.history.items);
  const hydrated = useAppSelector((state) => state.history.hydrated);
  const latest = useMemo(() => {
    const sorted = [...items].sort((a, b) => Date.parse(b.lastReadAt) - Date.parse(a.lastReadAt));
    if (storyId) return sorted.find((item) => item.storyId === storyId) ?? null;
    return sorted[0] ?? null;
  }, [items, storyId]);

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

  return (
    <Link
      className="resume-mini-bar"
      href={href}
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
}
