"use client";

import type { Route } from "next";
import Link from "next/link";
import { BellRing, BookOpen, Sparkles, Trophy } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryCover } from "@/components/StoryCover";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { useFreshStoryRealtime } from "@/hooks/useFreshStoryRealtime";
import { formatRelativeActivity } from "@/lib/content-timestamps";
import { storyHref } from "@/lib/urls";
import { useAppSelector } from "@/lib/store-hooks";

const MotionFX = dynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX), { ssr: false });

type ShelfTab = "reading" | "following" | "completed";

const SHELF_TABS: { id: ShelfTab; label: string }[] = [
  { id: "reading", label: "Đang đọc" },
  { id: "following", label: "Theo dõi" },
  { id: "completed", label: "Hoàn thành" }
];

export function FollowingClient() {
  const follows = useAppSelector((state) => state.follows.items);
  const history = useAppSelector((state) => state.history.items);
  const { isFresh } = useFreshStoryRealtime();
  const [tab, setTab] = useState<ShelfTab>("reading");

  const historyByStory = useMemo(() => new Map(history.map((item) => [item.storyId, item])), [history]);
  const totalUnread = follows.reduce((total, item) => {
    const read = historyByStory.get(item.storyId)?.maxReadChapterNumber ?? 0;
    return total + Math.max(0, item.totalChapters - read);
  }, 0);

  const visibleFollows = useMemo(() => {
    return follows.filter((item) => {
      const progress = historyByStory.get(item.storyId);
      const maxRead = progress?.maxReadChapterNumber ?? 0;
      const completed = item.totalChapters > 0 && maxRead >= item.totalChapters;
      if (tab === "completed") return completed;
      if (tab === "reading") return Boolean(progress) && !completed;
      return true;
    });
  }, [follows, historyByStory, tab]);

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

        {follows.length > 0 ? (
          <div className="filters following-shelf-tabs" role="tablist" aria-label="Kệ truyện">
            {SHELF_TABS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                className={`chip ${tab === option.id ? "chip-active" : ""}`}
                aria-selected={tab === option.id}
                onClick={() => setTab(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

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
        ) : visibleFollows.length === 0 ? (
          <XianxiaEmptyState
            title="Kệ này chưa có linh quyển."
            hint="Thử chuyển sang tab khác hoặc theo dõi thêm truyện từ thư viện."
            className="following-empty"
          />
        ) : (
          <div className="following-grid">
            {visibleFollows.map((item) => {
              const progress = historyByStory.get(item.storyId);
              const unread = Math.max(0, item.totalChapters - (progress?.maxReadChapterNumber ?? 0));
              const targetChapter = progress?.chapterNumber ?? undefined;
              const activityLabel = formatRelativeActivity(item.updatedAt);

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
                      {activityLabel ? ` · ${activityLabel}` : ""}
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
