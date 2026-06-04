"use client";

import { BookOpenCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

export function ReadingResumeBar() {
  const latest = useAppSelector((state) => state.history.items[0] ?? null);
  if (!latest) return null;

  return (
    <Link className="resume-mini-bar" href={storyHref({ id: latest.storyId, title: latest.storyTitle }, latest.chapterNumber)}>
      <BookOpenCheck size={16} />
      <span>
        <strong>Đọc tiếp: {latest.storyTitle}</strong>
        <small>Chương {latest.chapterNumber} · {Math.round(latest.progressPercent)}%</small>
      </span>
      <ChevronRight size={16} />
    </Link>
  );
}
