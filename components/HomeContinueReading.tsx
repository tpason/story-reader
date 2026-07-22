"use client";

import { BookOpenCheck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { useAppSelector } from "@/lib/store-hooks";
import { storyHref } from "@/lib/urls";

/** Homepage continue rail — lifted out of StoryLibrary for CN/KR vertical story order. */
export function HomeContinueReading() {
  const history = useAppSelector((state) => state.history.items);
  const recentItems = useMemo(() => history.slice(0, 6), [history]);
  const { isFresh } = useFreshStoryRealtime();

  if (recentItems.length === 0) return null;

  return (
    <section className="continue-section home-continue-section" aria-label="Tu luyện tiếp">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Tu luyện tiếp</p>
          <h2>Hành trình đang đọc</h2>
        </div>
        <Link href="/reading-history">Tàng thư</Link>
      </div>
      <div className="continue-row">
        {recentItems.map((item) => (
          <Link
            className={`continue-card ${isFresh(item.storyId) ? "continue-card-fresh" : ""}`.trim()}
            href={storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber)}
            key={item.storyId}
          >
            <BookOpenCheck size={16} />
            <span>{item.storyTitle}</span>
            <small>Chương {item.chapterNumber}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
