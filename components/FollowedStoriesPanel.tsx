"use client";

import { BellRing, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { StoryCover } from "@/components/StoryCover";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { prefetchReaderChapterQuery, prefetchStorySummaryQuery } from "@/lib/reader-query";
import { armStoryCoverViewTransition } from "@/lib/story-cover-view-transition";
import { warmReaderClientChunk } from "@/lib/warm-reader-client";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

export function FollowedStoriesPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);
  const hydrated = useAppSelector((state) => state.follows.hydrated);
  const { isFresh } = useFreshStoryRealtime();

  const historyByStory = new Map(history.map((item) => [item.storyId, item]));

  if (!hydrated && follows.length === 0) {
    return (
      <section className="followed-section followed-section--slot" aria-hidden="true" />
    );
  }

  // Homepage IA: rail or nothing — empty shelf must not own a full marketing block.
  if (follows.length === 0) {
    return null;
  }

  const visibleItems = follows.slice(0, 8);
  const totalUnread = follows.reduce((total, item) => {
    const read = historyByStory.get(item.storyId)?.maxReadChapterNumber ?? 0;
    return total + Math.max(0, item.totalChapters - read);
  }, 0);

  return (
    <section className="followed-section" aria-label="Truyện đang theo dõi">
      <div className="section-heading-row story-list-heading followed-heading-compact">
        <div>
          <p className="eyebrow">Tủ truyện</p>
          <h2>Đang theo dõi</h2>
        </div>
        <Link className="discovery-more" href={follows.length > 8 ? "/following" : "/updates"}>
          <Sparkles size={15} />
          {follows.length > 8 ? "Xem tất cả" : totalUnread > 0 ? `Mới +${totalUnread}` : "Cập nhật"}
        </Link>
      </div>

      <div className="followed-row">
        {visibleItems.map((item) => {
          const progress = historyByStory.get(item.storyId);
          const unread = Math.max(0, item.totalChapters - (progress?.maxReadChapterNumber ?? 0));
          const targetChapter = progress?.chapterNumber ?? undefined;
          const href = targetChapter
            ? storyHref({ id: item.storyId, title: item.storyTitle }, targetChapter)
            : storyHref({ id: item.storyId, title: item.storyTitle });

          const warmNav = () => {
            router.prefetch(href);
            void prefetchStorySummaryQuery(queryClient, item.storyId);
            if (targetChapter) {
              warmReaderClientChunk();
              void prefetchReaderChapterQuery(queryClient, item.storyId, targetChapter);
            }
          };

          return (
            <Link
              className={`followed-card ${isFresh(item.storyId) ? "followed-card-fresh" : ""}`.trim()}
              href={href}
              key={item.storyId}
              onMouseEnter={warmNav}
              onFocus={warmNav}
              onClick={(event) => armStoryCoverViewTransition(event.currentTarget)}
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
      {follows.length > 8 ? (
        <p className="followed-shelf-more">
          <Link className="chip" href="/following">
            Xem cả {follows.length} quyển đang theo dõi
          </Link>
        </p>
      ) : null}
    </section>
  );
}
