"use client";

import type { Route } from "next";
import Link from "next/link";
import { BellRing, BookOpen, Sparkles, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryCover } from "@/components/StoryCover";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

const MotionFX = dynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX), { ssr: false });

export function FollowingClient() {
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);
  const { isFresh } = useFreshStoryRealtime();

  const historyByStory = new Map(history.map((item) => [item.storyId, item]));
  const totalUnread = follows.reduce((total, item) => {
    const read = historyByStory.get(item.storyId)?.maxReadChapterNumber ?? 0;
    return total + Math.max(0, item.totalChapters - read);
  }, 0);

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <SiteHeader />

      <div className="page-wrap following-page">
        <XiPageHeroStrip
          className="following-header"
          eyebrow={
            <>
              <BellRing size={13} aria-hidden />
              Tủ truyện · Linh Quyển Các
            </>
          }
          title="Linh quyển đang theo dõi"
          subtitle="Mọi truyện bạn đã kết bái. Đọc tiếp từ chương dừng, hoặc sang Chương mới khi có linh tin."
        >
          {follows.length > 0 ? (
            <div className="following-summary">
              <BookOpen size={17} aria-hidden />
              <strong>{follows.length}</strong>
              <span>quyển · {totalUnread > 0 ? `mới +${totalUnread} chương` : "đã cập nhật"}</span>
            </div>
          ) : null}
        </XiPageHeroStrip>

        {follows.length === 0 ? (
          <XianxiaEmptyState
            title="Chưa có linh quyển trong tủ."
            hint="Theo dõi truyện từ trang chi tiết hoặc khám phá top thiên bảng để bắt đầu."
            className="following-empty"
          >
            <div className="xianxia-empty-actions">
              <Link className="chip chip-inverted" href={"/rankings?tab=betterbox" as Route}>
                <Trophy size={14} aria-hidden />
                Top thiên bảng
              </Link>
              <Link className="chip" href="/discover">
                Khám phá truyện
              </Link>
            </div>
          </XianxiaEmptyState>
        ) : (
          <div className="following-grid">
            {follows.map((item) => {
              const progress = historyByStory.get(item.storyId);
              const unread = Math.max(0, item.totalChapters - (progress?.maxReadChapterNumber ?? 0));
              const targetChapter = progress?.chapterNumber ?? undefined;

              return (
                <Link
                  key={item.storyId}
                  className={`followed-card followed-card-page ${isFresh(item.storyId) ? "followed-card-fresh" : ""}`.trim()}
                  href={
                    targetChapter
                      ? storyHref({ id: item.storyId, title: item.storyTitle }, targetChapter)
                      : storyHref({ id: item.storyId, title: item.storyTitle })
                  }
                >
                  <StoryCover src={item.coverImageUrl} title={item.storyTitle} />
                  <div>
                    <div className="followed-kicker">
                      <BellRing size={13} />
                      <span>{unread > 0 ? `Mới +${unread}` : "Đang theo dõi"}</span>
                    </div>
                    <h3>{item.storyTitle}</h3>
                    <p>
                      {progress
                        ? `Đọc tiếp chương ${progress.chapterNumber} · ${item.totalChapters} chương`
                        : `${item.totalChapters} chương · chưa bắt đầu`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {follows.length > 0 ? (
          <p className="following-footer-hint">
            <Sparkles size={13} aria-hidden />
            Chương mới và linh tin:{" "}
            <Link href="/updates">mục Cập nhật</Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
