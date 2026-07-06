"use client";

import type { Route } from "next";
import { BellRing, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { StoryCover } from "@/components/StoryCover";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

export function FollowedStoriesPanel() {
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);
  const { isFresh } = useFreshStoryRealtime();

  const historyByStory = new Map(history.map((item) => [item.storyId, item]));

  if (follows.length === 0) {
    return (
      <section className="followed-section followed-section-empty" aria-label="Truyện đang theo dõi">
        <div className="section-heading-row story-list-heading">
          <div>
            <h2>Tủ truyện của đạo hữu</h2>
            <p className="followed-empty-copy">Theo dõi linh quyển yêu thích để đọc tiếp nhanh và nhận chương mới.</p>
          </div>
        </div>
        <div className="xianxia-empty-actions followed-empty-actions">
          <Link className="chip chip-inverted" href={"/rankings?tab=betterbox" as Route}>
            <Trophy size={14} aria-hidden />
            Xem top thiên bảng
          </Link>
          <Link className="chip" href={"/rankings?tab=trending" as Route}>
            Phong vân tuần
          </Link>
          <Link className="chip" href="/discover">
            Khám phá truyện
          </Link>
        </div>
      </section>
    );
  }

  const visibleItems = follows.slice(0, 8);
  const totalUnread = follows.reduce((total, item) => {
    const read = historyByStory.get(item.storyId)?.maxReadChapterNumber ?? 0;
    return total + Math.max(0, item.totalChapters - read);
  }, 0);

  return (
    <section className="followed-section" aria-label="Truyện đang theo dõi">
      <div className="section-heading-row story-list-heading">
        <div>
          <h2>Tủ truyện của đạo hữu</h2>
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
