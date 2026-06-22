"use client";

import { BellRing, Sparkles } from "lucide-react";
import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

export function FollowedStoriesPanel() {
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);
  const { isFresh } = useFreshStoryRealtime();

  if (follows.length === 0) return null;

  const historyByStory = new Map(history.map((item) => [item.storyId, item]));
  const visibleItems = follows.slice(0, 8);
  const totalUnread = follows.reduce((total, item) => {
    const read = historyByStory.get(item.storyId)?.maxReadChapterNumber ?? 0;
    return total + Math.max(0, item.totalChapters - read);
  }, 0);

  return (
    <section className="followed-section" aria-label="Truyện đang theo dõi">
      <div className="section-heading-row story-list-heading">
        <div>
          <p className="eyebrow">Đang theo dõi</p>
          <h2>Tủ truyện của đạo hữu</h2>
        </div>
        <Link className="discovery-more" href="/updates">
          <Sparkles size={15} />
          {totalUnread > 0 ? `Mới +${totalUnread}` : "Cập nhật"}
        </Link>
      </div>

      <div className="followed-row">
        {visibleItems.map((item) => {
          const progress = historyByStory.get(item.storyId);
          const unread = Math.max(0, item.totalChapters - (progress?.maxReadChapterNumber ?? 0));
          const targetChapter = progress?.chapterNumber ?? undefined;

          return (
            <Link
              className={`followed-card ${isFresh(item.storyId) ? "followed-card-fresh" : ""}`.trim()}
              href={targetChapter ? storyHref({ id: item.storyId, title: item.storyTitle }, targetChapter) : storyHref({ id: item.storyId, title: item.storyTitle })}
              key={item.storyId}
            >
              <StoryCover src={item.coverImageUrl} title={item.storyTitle} />
              <div>
                <div className="followed-kicker">
                  <BellRing size={13} />
                  <span>{unread > 0 ? `Mới +${unread}` : "Đang theo dõi"}</span>
                </div>
                <h3>{item.storyTitle}</h3>
                <p>{progress ? `Đọc tiếp chương ${progress.chapterNumber}` : `${item.totalChapters} chương`}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
