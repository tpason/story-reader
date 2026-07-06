"use client";

import type { Route } from "next";
import Link from "next/link";
import { BookOpen, Clock3, Crown, ScrollText, Sparkles } from "lucide-react";
import { CultivationAvatar } from "@/components/CultivationAvatar";
import { RankCalligraphySeal } from "@/components/RankCalligraphySeal";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import type { ReaderLeaderboardItem, ReaderLeaderboardScope, TrendingPeriod } from "@/lib/types";

const PERIOD_LABELS: Record<TrendingPeriod, string> = {
  day: "Nhật bang",
  week: "Tuần bang",
  month: "Nguyệt bang",
  year: "Niên bang"
};

const RANK_TIERS = ["gold", "silver", "bronze"] as const;

function tierForRank(rank: number) {
  return RANK_TIERS[rank - 1] ?? "jade";
}

function formatReadTime(seconds: number) {
  if (seconds < 60) return `${seconds} khắc`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút tu đọc`;
  return `${(minutes / 60).toFixed(1)} giờ tu đọc`;
}

type ReaderLeaderboardProps = {
  items: ReaderLeaderboardItem[];
  scope: ReaderLeaderboardScope;
  period?: TrendingPeriod;
};

function ReaderStats({ reader }: { reader: ReaderLeaderboardItem }) {
  return (
    <div className="reader-leaderboard-stats">
      <span className="rankings-qi-pill">
        <ScrollText size={13} aria-hidden />
        {reader.sessionCount} phiên
      </span>
      <span className="rankings-qi-pill">
        <BookOpen size={13} aria-hidden />
        {reader.storyCount} quyển
      </span>
      {reader.readSeconds > 0 ? (
        <span className="rankings-qi-pill rankings-qi-pill-muted">
          <Clock3 size={12} aria-hidden />
          {formatReadTime(reader.readSeconds)}
        </span>
      ) : null}
      {reader.scope === "members" && reader.chaptersReached > 0 ? (
        <span className="rankings-qi-pill rankings-qi-pill-muted">
          <Sparkles size={12} aria-hidden />
          {reader.chaptersReached} chương tích
        </span>
      ) : null}
    </div>
  );
}

function ReaderPodiumCard({ reader }: { reader: ReaderLeaderboardItem }) {
  const tier = tierForRank(reader.rank);
  return (
    <article
      className={`reader-leaderboard-podium-card rankings-podium-card rankings-podium-${tier} reader-leaderboard-podium--${tier}`}
      data-reader-rank={reader.rank}
    >
      <span className="reader-leaderboard-fx reader-leaderboard-fx-aura" aria-hidden />
      <span className="reader-leaderboard-fx reader-leaderboard-fx-mist" aria-hidden />
      <span className="reader-leaderboard-fx reader-leaderboard-fx-sparkles" aria-hidden>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      {reader.rank === 1 ? (
        <span className="reader-leaderboard-fx reader-leaderboard-fx-crown" aria-hidden>
          <Crown size={15} strokeWidth={2.2} />
        </span>
      ) : null}
      <div className="rankings-podium-plinth" aria-hidden />
      <RankCalligraphySeal rank={reader.rank} size="podium" />
      <div className="reader-leaderboard-podium-body">
        <div className={`reader-leaderboard-avatar-stage reader-leaderboard-avatar-stage--${tier}`}>
          <CultivationAvatar
            username={reader.displayName}
            level={reader.cultivationLevel}
            isAdmin={reader.isAdmin}
            size="lg"
            muted={reader.scope === "guests"}
          />
        </div>
        <h3>{reader.displayName}</h3>
        <p className="reader-leaderboard-meta">
          {reader.scope === "members" ? (
            <>
              {reader.cultivationRealm} · cảnh {reader.cultivationLevel}
              {reader.isAdmin ? " · Tiên quan" : ""}
            </>
          ) : (
            "Khách tu đọc ẩn danh"
          )}
        </p>
        <ReaderStats reader={reader} />
      </div>
    </article>
  );
}

function ReaderPodium({ items }: { items: ReaderLeaderboardItem[] }) {
  const [first, second, third] = items;
  if (!first) return null;

  return (
    <div className="reader-leaderboard-podium-wrap">
      <span className="reader-leaderboard-podium-veil" aria-hidden />
      <div className="reader-leaderboard-podium rankings-podium" aria-label="Tam hạng tu giả">
      {second ? <ReaderPodiumCard reader={second} /> : <div className="rankings-podium-spacer" aria-hidden />}
      <ReaderPodiumCard reader={first} />
      {third ? <ReaderPodiumCard reader={third} /> : <div className="rankings-podium-spacer" aria-hidden />}
      </div>
    </div>
  );
}

export function ReaderLeaderboard({ items, scope, period = "week" }: ReaderLeaderboardProps) {
  if (!items.length) {
    return (
      <XianxiaEmptyState
        title={
          scope === "members"
            ? "Chưa có đạo hữu lên bảng trong kỳ này."
            : "Chưa có tán tu đủ linh khí để lên bảng."
        }
        hint="Tu đọc từ 5 giây trở lên sẽ được Thiên Thư ghi nhận phiên đọc."
      >
        <div className="xianxia-empty-actions">
          <Link className="chip" href="/">
            Mở linh quyển
          </Link>
          {scope === "members" ? (
            <Link className="chip chip-inverted" href={"/account" as Route}>
              Vào động phủ
            </Link>
          ) : (
            <Link className="chip chip-inverted" href={"/rankings?tab=readers&scope=members" as Route}>
              Xem đạo hữu bảng
            </Link>
          )}
        </div>
      </XianxiaEmptyState>
    );
  }

  const podiumItems = items.slice(0, 3);
  const restItems = items.slice(3);

  return (
    <div className="reader-leaderboard-board rankings-board">
      <div className="rankings-board-caption" aria-hidden>
        <ScrollText size={14} />
        <span>
          {scope === "members" ? "Đạo hữu bảng" : "Tán tu bảng"} · {PERIOD_LABELS[period]}
        </span>
      </div>

      {podiumItems.length >= 2 ? <ReaderPodium items={podiumItems} /> : null}

      <ol className="reader-leaderboard-list rankings-list">
        {(podiumItems.length < 2 ? items : restItems).map((reader) => {
          const tier = tierForRank(reader.rank);
          return (
          <li
            key={reader.userId ?? reader.anonymousId ?? reader.rank}
            className={`reader-leaderboard-item rankings-item${reader.rank <= 3 ? " rankings-item-top reader-leaderboard-item--top" : ""}${reader.rank <= 3 ? ` reader-leaderboard-item--${tier}` : ""}`}
            data-reader-rank={reader.rank}
          >
            <RankCalligraphySeal rank={reader.rank} />
            <div className="reader-leaderboard-card rankings-card">
              <div className={`reader-leaderboard-avatar-stage reader-leaderboard-avatar-stage--list${reader.rank <= 3 ? ` reader-leaderboard-avatar-stage--${tier}` : ""}`}>
                <CultivationAvatar
                  username={reader.displayName}
                  level={reader.cultivationLevel}
                  isAdmin={reader.isAdmin}
                  size="md"
                  muted={reader.scope === "guests"}
                  className="reader-leaderboard-avatar"
                />
              </div>
              <div className="reader-leaderboard-body rankings-body">
                <h3>{reader.displayName}</h3>
                <p className="reader-leaderboard-meta rankings-meta">
                  {reader.scope === "members" ? (
                    <>
                      {reader.cultivationRealm} · cảnh {reader.cultivationLevel}
                      {reader.isAdmin ? " · Tiên quan" : ""}
                    </>
                  ) : (
                    "Ẩn danh · không đồng bộ tu vi"
                  )}
                </p>
                <ReaderStats reader={reader} />
              </div>
            </div>
          </li>
          );
        })}
      </ol>
    </div>
  );
}
