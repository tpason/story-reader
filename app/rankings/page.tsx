import type { Route } from "next";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { Crown, Flame, Library, ScrollText, Sparkles, Trophy, Users } from "lucide-react";
import { RankingsList } from "@/components/RankingsList";
import { RankingsSectionShell } from "@/components/RankingsSectionShell";
import { ReaderLeaderboard } from "@/components/ReaderLeaderboard";
import { SiteHeader } from "@/components/SiteHeader";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import {
  getCachedBetterBoxRankings,
  getCachedTopReaders,
  getCachedTrendingStories,
  listSourceRankBoards,
  listSourceRankedStories,
  type SourceRankBoard
} from "@/lib/stories";
import { formatRankBoardLabel } from "@/lib/source-labels";
import type { ReaderLeaderboardScope, TrendingPeriod } from "@/lib/types";

const MotionFX = nextDynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX));

export const revalidate = 120;

export const metadata = {
  title: "Bảng xếp hạng | Linh Quyển Các",
  description: "Top truyện, đạo hữu tu đọc, xếp hạng BetterBox và bảng nguồn crawl trên Linh Quyển Các."
};

type RankingsProps = {
  searchParams: Promise<{
    tab?: string;
    period?: string;
    scope?: string;
    source?: string;
    board?: string;
  }>;
};

const PERIODS: TrendingPeriod[] = ["day", "week", "month", "year"];
const READER_SCOPES: ReaderLeaderboardScope[] = ["members", "guests"];

function parsePeriod(value?: string): TrendingPeriod {
  return PERIODS.includes(value as TrendingPeriod) ? (value as TrendingPeriod) : "week";
}

function parseReaderScope(value?: string): ReaderLeaderboardScope {
  return value === "guests" ? "guests" : "members";
}

function rankingsHref(tab: string, extra: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ tab });
  Object.entries(extra).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/rankings?${params.toString()}` as Route;
}

const PERIOD_LABELS: Record<TrendingPeriod, string> = {
  day: "Nhật",
  week: "Tuần",
  month: "Nguyệt",
  year: "Niên"
};

export default async function RankingsPage({ searchParams }: RankingsProps) {
  const params = await searchParams;
  const tab =
    params.tab === "trending"
      ? "trending"
      : params.tab === "source"
        ? "source"
        : params.tab === "readers"
          ? "readers"
          : "betterbox";
  const period = parsePeriod(params.period);
  const readerScope = parseReaderScope(params.scope);
  const sourceCode = params.source?.trim() || "";
  const boardName = params.board?.trim() || "";

  const [trending, betterbox, boards, topReaders] = await Promise.all([
    tab === "trending" ? getCachedTrendingStories(period, 30) : Promise.resolve([]),
    tab === "betterbox" ? getCachedBetterBoxRankings(50) : Promise.resolve([]),
    tab === "source" ? listSourceRankBoards(16) : Promise.resolve([] as SourceRankBoard[]),
    tab === "readers" ? getCachedTopReaders(readerScope, period, 40) : Promise.resolve([]),
  ]);

  const activeBoard =
    boards.find((b) => (sourceCode ? b.sourceCode === sourceCode : true) && (boardName ? b.rankName === boardName : true)) ??
    boards[0];
  const sourceStories =
    tab === "source" && activeBoard
      ? await listSourceRankedStories({
          sourceCode: activeBoard.sourceCode,
          rankName: activeBoard.rankName,
          limit: 40
        })
      : [];

  const title =
    tab === "betterbox"
      ? "Thiên Bảng Linh Quyển"
      : tab === "source"
        ? "Cổ Nguyên Bảng"
        : tab === "readers"
          ? "Tu Giả Bảng"
          : "Phong Vân Bảng";

  const subtitle =
    tab === "betterbox"
      ? "Thiên cơ xếp hạng theo khí vận độc giả, phẩm chất bản đọc và đánh giá đạo hữu. Không lẫn rank crawl ngoại vực."
      : tab === "source"
        ? "Ấn ký thứ hạng từ nguồn cổ, lưu để tham chiếu linh quyển từng thịnh hành."
        : tab === "readers"
          ? readerScope === "guests"
            ? "Tán tu ẩn danh có nhiều phiên tu đọc nhất. Chỉ hiện mã ẩn, không lộ thân phận."
            : "Đạo hữu nhập môn tu đọc nhiều nhất theo phiên, thời gian và linh quyển đã khai."
          : "Danh sách linh quyển có nhiều đạo hữu và tán tu tu đọc nhất trong kỳ.";

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <SiteHeader />

      <div className="page-wrap rankings-page">
        <XiPageHeroStrip
          className="rankings-header"
          eyebrow={
            <>
              <Trophy size={13} aria-hidden />
              Thiên Bảng · Linh Quyển Các
            </>
          }
          title={title}
          subtitle={subtitle}
        >
          <div className="filters rankings-tabs">
            <Link className={`chip ${tab === "trending" ? "chip-active" : ""}`} href={rankingsHref("trending", { period })}>
              <Flame size={15} aria-hidden />
              Phong vân
            </Link>
            <Link className={`chip ${tab === "betterbox" ? "chip-active" : ""}`} href={rankingsHref("betterbox")}>
              <Crown size={15} aria-hidden />
              Thiên bảng
            </Link>
            <Link className={`chip ${tab === "source" ? "chip-active" : ""}`} href={rankingsHref("source")}>
              <Library size={15} aria-hidden />
              Cổ nguyên
            </Link>
            <Link className={`chip ${tab === "readers" ? "chip-active" : ""}`} href={rankingsHref("readers", { period, scope: readerScope })}>
              <Users size={15} aria-hidden />
              Tu giả
            </Link>
          </div>
        </XiPageHeroStrip>

        {tab === "trending" || tab === "readers" ? (
          <div className="filters rankings-period-tabs" aria-label="Khoảng thời gian">
            {PERIODS.map((p) => (
              <Link
                key={p}
                className={`chip ${period === p ? "chip-active" : ""}`}
                href={rankingsHref(tab, tab === "readers" ? { period: p, scope: readerScope } : { period: p })}
              >
                <Sparkles size={14} aria-hidden />
                {PERIOD_LABELS[p]}
              </Link>
            ))}
          </div>
        ) : null}

        {tab === "readers" ? (
          <div className="filters rankings-board-tabs" aria-label="Loại tu giả">
            {READER_SCOPES.map((scope) => (
              <Link
                key={scope}
                className={`chip ${readerScope === scope ? "chip-active" : ""}`}
                href={rankingsHref("readers", { period, scope })}
              >
                {scope === "members" ? "Đạo hữu" : "Tán tu"}
              </Link>
            ))}
          </div>
        ) : null}

        {tab === "source" && boards.length > 0 ? (
          <div className="filters rankings-board-tabs" aria-label="Bảng nguồn">
            {boards.map((board) => (
              <Link
                key={`${board.sourceCode}:${board.rankName}`}
                className={`chip ${activeBoard && activeBoard.sourceCode === board.sourceCode && activeBoard.rankName === board.rankName ? "chip-active" : ""}`}
                href={rankingsHref("source", { source: board.sourceCode, board: board.rankName })}
              >
                {formatRankBoardLabel(board.sourceCode, board.rankName, board.storyCount)}
              </Link>
            ))}
          </div>
        ) : null}

        <RankingsSectionShell
          caption={
            <p className="rankings-board-caption rankings-board-caption-page">
              <ScrollText size={14} aria-hidden />
              {tab === "trending"
                ? `Kỳ ${PERIOD_LABELS[period].toLowerCase()} · ghi theo phiên tu đọc`
                : tab === "readers"
                  ? readerScope === "guests"
                    ? `Kỳ ${PERIOD_LABELS[period].toLowerCase()} · tán tu ẩn danh`
                    : `Kỳ ${PERIOD_LABELS[period].toLowerCase()} · đạo hữu nhập môn`
                  : tab === "betterbox"
                    ? "Xếp theo khí vận tích lũy trên Thiên Thư"
                    : "Ấn ký từ bảng nguồn crawl"}
            </p>
          }
        >
          {tab === "trending" ? (
            <RankingsList items={trending} variant="trending" period={period} />
          ) : tab === "betterbox" ? (
            <RankingsList items={betterbox} variant="betterbox" emptyTitle="Thiên bảng chưa có linh quyển. Tu đọc vài chương để Thiên Thư ghi nhận khí vận độc giả." />
          ) : tab === "readers" ? (
            <ReaderLeaderboard items={topReaders} scope={readerScope} period={period} />
          ) : (
            <RankingsList
              items={sourceStories}
              variant="source"
              emptyTitle="Chưa có bảng nguồn. Rank crawl sẽ hiện khi discovery ghi rank_position."
            />
          )}
        </RankingsSectionShell>
      </div>
    </main>
  );
}
