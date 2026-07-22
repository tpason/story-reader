import type { Route } from "next";
import type { Metadata } from "next";
import { CheckCircle2, Flame, Headphones, Layers3, Sparkles, Trophy, X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { getCachedCategories, getCachedDefaultHomeStories, getCachedPolishedStories, getCachedTrendingStories, getCachedUpdatedStories, listStoriesCursor } from "@/lib/stories";
import { buildHomeFilterLabels, isHomeSearchActive } from "@/lib/home-search";
import { DISCOVERY_POLISHED_FILTER } from "@/lib/discovery-labels";
import { LibrarySortChips } from "@/components/LibrarySortChips";
import { StoryLibrary } from "@/components/StoryLibrary";
import { ReadingResumeBar } from "@/components/ReadingResumeBar";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryDiscoveryRail } from "@/components/StoryDiscoveryRail";
import { DiscoveryRailSkeleton } from "@/components/DiscoveryRailSkeleton";
import { TrendingStoriesPanel } from "@/components/TrendingStoriesPanel";
import { HomeGuestInvite } from "@/components/HomeGuestInvite";
import { HomeFeaturedStory } from "@/components/HomeFeaturedStory";
import { JsonLdScript } from "@/components/JsonLdScript";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_DESCRIPTION } from "@/lib/brand";
import { buildHomeJsonLd } from "@/lib/json-ld";
import { parseTrendingPeriod } from "@/lib/trending-period";
import type { TrendingPeriod } from "@/lib/types";

const MotionFX = nextDynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX));
const FollowedStoriesPanel = nextDynamic(
  () => import("@/components/FollowedStoriesPanel").then((mod) => mod.FollowedStoriesPanel),
);
const CultivationPanel = nextDynamic(
  () => import("@/components/CultivationPanel").then((mod) => mod.CultivationPanel),
);

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_NAME,
    description: SITE_OG_DESCRIPTION,
    url: "/",
  },
};

type HomeProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    author?: string;
    hot?: string;
    completed?: string;
    category?: string;
    minChapters?: string;
    maxChapters?: string;
    hasPolished?: string;
    hasAudio?: string;
    sort?: string;
    trendPeriod?: string;
  }>;
};

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query.toString();
}

function buildHomeTrendPeriodHref(period: TrendingPeriod, params: Record<string, string | undefined>): Route {
  return `/?${buildQuery({ ...params, trendPeriod: period })}` as Route;
}

async function DiscoverySection() {
  // Denser desktop first viewport — avoid empty mountain after personal strip.
  const [polishedStories, updatedStories] = await Promise.all([
    getCachedPolishedStories(6),
    getCachedUpdatedStories(6),
  ]);
  return <StoryDiscoveryRail polishedStories={polishedStories} updatedStories={updatedStories} />;
}

async function TrendingSection({
  period,
  linkParams,
}: {
  period: TrendingPeriod;
  linkParams: Record<string, string | undefined>;
}) {
  const trending = await getCachedTrendingStories(period, 6);
  return (
    <TrendingStoriesPanel
      items={trending}
      period={period}
      density="bookstore"
      hrefForPeriod={(p) => buildHomeTrendPeriodHref(p, linkParams)}
    />
  );
}

/** A1: one spotlight from trending, else polished — cached reads only. */
async function FeaturedSection({ period }: { period: TrendingPeriod }) {
  const trending = await getCachedTrendingStories(period, 1);
  if (trending[0]) {
    return <HomeFeaturedStory story={trending[0]} kicker="Phong vân đang mở" />;
  }
  const polished = await getCachedPolishedStories(1);
  if (polished[0]) {
    return <HomeFeaturedStory story={polished[0]} kicker="Mới tinh luyện" />;
  }
  return null;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const queryText = params.q?.trim() || undefined;
  const authorText = params.author?.trim() || undefined;

  const isSearchActive = isHomeSearchActive(params);

  const libraryKey = JSON.stringify({
    q: queryText ?? "",
    author: authorText ?? "",
    hot: params.hot ?? "",
    completed: params.completed ?? "",
    category: params.category ?? "",
    minChapters: params.minChapters ?? "",
    maxChapters: params.maxChapters ?? "",
    hasPolished: params.hasPolished ?? "",
    hasAudio: params.hasAudio ?? "",
    sort: params.sort ?? ""
  });

  const isDefaultHomeCatalog =
    !queryText &&
    !authorText &&
    params.hot !== "true" &&
    params.completed !== "true" &&
    !params.category &&
    !params.minChapters &&
    !params.maxChapters &&
    params.hasPolished !== "true" &&
    params.hasAudio !== "true" &&
    !params.sort;

  const [stories, categories] = await Promise.all([
    isDefaultHomeCatalog
      ? getCachedDefaultHomeStories()
      : listStoriesCursor({
          limit: 24,
          queryText,
          author: authorText,
          hot: params.hot === "true",
          completed: params.completed === "true" ? true : undefined,
          category: params.category,
          // Match /api/stories default: hide catalog-only / empty stories on first paint
          minChapters: Number(params.minChapters) > 0 ? Number(params.minChapters) : 1,
          maxChapters: Number(params.maxChapters) > 0 ? Number(params.maxChapters) : undefined,
          hasPolished: params.hasPolished === "true",
          hasAudio: params.hasAudio === "true",
          sort: params.sort === "chapters" || params.sort === "hot" || params.sort === "title" || params.sort === "updated" || params.sort === "trending" || params.sort === "reader_rank" ? params.sort : undefined
        }),
    getCachedCategories(12),
  ]);

  const activeFilterLabels = buildHomeFilterLabels(params);
  const trendPeriod = parseTrendingPeriod(params.trendPeriod);
  const filterQueryBase = {
    q: params.q,
    category: params.category,
    hot: params.hot,
    completed: params.completed,
    minChapters: params.minChapters,
    maxChapters: params.maxChapters,
    hasPolished: params.hasPolished,
    hasAudio: params.hasAudio,
    sort: params.sort,
  };
  const trendLinkParams = {
    ...filterQueryBase,
    author: authorText,
  };

  return (
    <main className="app-shell">
      <JsonLdScript data={buildHomeJsonLd()} />
      <MotionFX variant="library" />
      <SiteHeader />

      <div className="page-wrap" data-search-active={isSearchActive ? "true" : undefined}>
        {/*
          Bookstore IA (Fanqie/Kakao/Qidian synthesis):
          singular resume (+ recent) → follows rail-or-nothing → discovery + compact trending
          → compact brand/poetry → cultivation → sticky catalog (all filters)
        */}
        {!isSearchActive ? (
          <div className="home-priority-rail" aria-label="Tu luyện đang mở">
            <ReadingResumeBar showRecentRail />
            <section className="home-follows-block" aria-label="Tủ truyện đang theo">
              <FollowedStoriesPanel />
            </section>
            <HomeGuestInvite />
          </div>
        ) : null}

        {/* Content before brand hero — desktop first viewport must not feel empty. */}
        {isSearchActive ? (
          <div className="search-active-header">
            <div className="search-active-info">
              <span className="search-active-count">{stories.total ?? stories.items.length} kết quả</span>
              {activeFilterLabels.length > 0 && (
                <span className="search-active-filters">
                  {activeFilterLabels.map((label, i) => (
                    <span key={i} className="search-active-tag">{label}</span>
                  ))}
                </span>
              )}
            </div>
            <Link href="/" className="chip search-clear-all">
              <X size={13} />
              Xóa tất cả
            </Link>
          </div>
        ) : (
          <div className="home-story-flow home-story-flow--dense">
            <Suspense fallback={<DiscoveryRailSkeleton />}>
              <DiscoverySection />
            </Suspense>
            <div className="home-trending-compact">
              <Suspense fallback={<DiscoveryRailSkeleton />} key={`trending-${trendPeriod}`}>
                <TrendingSection period={trendPeriod} linkParams={trendLinkParams} />
              </Suspense>
            </div>
            <p className="home-discovery-jump">
              <Link className="chip" href={"/rankings?tab=trending" as Route}>
                <Trophy size={14} aria-hidden />
                Thiên bảng
              </Link>
              <Link className="chip" href="/discover">
                <Sparkles size={14} aria-hidden />
                Khám phá thêm
              </Link>
            </p>
            {categories.length > 0 ? (
              <nav
                id="home-category-portal"
                className="home-category-portal category-row"
                aria-label="Thể loại linh quyển"
              >
                <span className="home-category-portal-label">Thể loại</span>
                {categories.slice(0, 10).map((category) => (
                  <Link
                    key={category.id}
                    className={`chip ${params.category === category.slug ? "chip-active" : ""}`}
                    href={`/?${buildQuery({
                      ...filterQueryBase,
                      category: category.slug,
                    })}`}
                  >
                    {category.name}
                    <span className="chip-count">{category.storyCount}</span>
                  </Link>
                ))}
                <Link className="chip category-row-more" href="/categories">
                  <Layers3 size={14} aria-hidden />
                  Tất cả
                </Link>
              </nav>
            ) : null}
            <Suspense fallback={null} key={`featured-${trendPeriod}`}>
              <FeaturedSection period={trendPeriod} />
            </Suspense>
          </div>
        )}

        {/* Search results chrome only — brand lives in topbar; mid-page brand-signal was redundant on mobile. */}
        {isSearchActive ? (
          <section
            className="library-header library-header--compact library-header--search-signal"
            aria-label="Kết quả tìm kiếm"
          >
            <div className="library-search-hero" aria-live="polite">
              <p className="eyebrow">Tìm trong Thiên Thư</p>
              <h1 className="library-search-hero-title">
                {queryText ? `“${queryText}”` : "Kết quả lọc"}
              </h1>
              <p className="library-search-hero-sub">
                {stories.total ?? stories.items.length} linh quyển phù hợp
              </p>
            </div>
          </section>
        ) : null}

        {/* Cultivation above sticky catalog — never under sticky "Danh sách truyện" chrome. */}
        {!isSearchActive ? (
          <div className="home-cultivation-slot home-cultivation-slot--compact">
            <CultivationPanel />
          </div>
        ) : null}

        {/* Sticky catalog panel: all catalog filters + infinite scroll (footer stays reachable below). */}
        <div className="library-sticky-panel">
          <div className="library-sticky-filters" aria-label="Lọc thư viện">
            <form className="filters library-search library-sticky-quick-filters">
              <input type="hidden" name="q" defaultValue={queryText ?? ""} key={queryText ?? ""} />
              <input type="hidden" name="category" value={params.category ?? ""} />
              <Link
                className={`chip ${params.hot === "true" ? "chip-active" : ""}`}
                href={`/?${buildQuery({ ...filterQueryBase, hot: params.hot === "true" ? undefined : "true" })}`}
              >
                <Flame size={15} />
                Hot
              </Link>
              <Link
                className={`chip ${params.completed === "true" ? "chip-active" : ""}`}
                href={`/?${buildQuery({ ...filterQueryBase, completed: params.completed === "true" ? undefined : "true" })}`}
              >
                <CheckCircle2 size={15} />
                Hoàn thành
              </Link>
              <details className="advanced-filter">
                <summary className="chip advanced-filter-summary">
                  <Layers3 size={15} />
                  Lọc nâng cao
                </summary>
                <div className="advanced-filter-panel">
                  <label>
                    <span>Tác giả</span>
                    <input name="author" defaultValue={params.author ?? ""} placeholder="Tên tác giả..." />
                  </label>
                  <label>
                    <span>Số chương từ</span>
                    <input name="minChapters" inputMode="numeric" defaultValue={params.minChapters ?? ""} placeholder="100" />
                  </label>
                  <label>
                    <span>Đến</span>
                    <input name="maxChapters" inputMode="numeric" defaultValue={params.maxChapters ?? ""} placeholder="2000" />
                  </label>
                  <label>
                    <span>Sắp xếp</span>
                    <select name="sort" defaultValue={params.sort ?? "updated"}>
                      <option value="updated">Mới cập nhật</option>
                      <option value="chapters">Nhiều chương</option>
                      <option value="hot">Đang hot (BetterBox)</option>
                      <option value="trending">Thịnh hành</option>
                      <option value="reader_rank">BXH độc giả</option>
                      <option value="title">Tên A-Z</option>
                    </select>
                  </label>
                  <label className="filter-check">
                    <input name="hasPolished" type="checkbox" value="true" defaultChecked={params.hasPolished === "true"} />
                    <Sparkles size={14} />
                    {DISCOVERY_POLISHED_FILTER}
                  </label>
                  <label className="filter-check">
                    <input name="hasAudio" type="checkbox" value="true" defaultChecked={params.hasAudio === "true"} />
                    <Headphones size={14} />
                    Có audio
                  </label>
                  <button className="chip chip-active" type="submit">
                    Áp dụng
                  </button>
                </div>
              </details>
            </form>

            {categories.length > 0 ? (
              <nav className="filters category-row library-sticky-chips" aria-label="Categories">
                <a
                  className={`chip ${!params.category ? "chip-active" : ""}`}
                  href={`/?${buildQuery({ q: params.q, hot: params.hot, completed: params.completed, minChapters: params.minChapters, maxChapters: params.maxChapters, hasPolished: params.hasPolished, hasAudio: params.hasAudio, sort: params.sort })}`}
                >
                  Tất cả
                </a>
                {categories.map((category) => (
                  <a
                    className={`chip ${params.category === category.slug ? "chip-active" : ""}`}
                    href={`/?${buildQuery({ q: params.q, hot: params.hot, completed: params.completed, category: category.slug, minChapters: params.minChapters, maxChapters: params.maxChapters, hasPolished: params.hasPolished, hasAudio: params.hasAudio, sort: params.sort })}`}
                    key={category.id}
                  >
                    {category.name}
                    <span className="chip-count">{category.storyCount}</span>
                  </a>
                ))}
                <Link className="chip category-row-more" href="/categories">
                  <Layers3 size={15} />
                  Tất cả thể loại
                </Link>
              </nav>
            ) : null}

            <div className="library-sticky-toolbar" aria-label="Sắp xếp thư viện">
              <LibrarySortChips
                currentSort={params.sort}
                hrefForSort={(sort) =>
                  buildQuery({
                    q: params.q,
                    hot: params.hot,
                    completed: params.completed,
                    category: params.category,
                    minChapters: params.minChapters,
                    maxChapters: params.maxChapters,
                    hasPolished: params.hasPolished,
                    hasAudio: params.hasAudio,
                    sort,
                    trendPeriod: params.trendPeriod
                  })
                }
              />
            </div>
          </div>

          <StoryLibrary
            key={libraryKey}
            initialPage={stories}
            mode={isSearchActive ? "search" : "default"}
            showContinueSection={false}
            showCultivationPanel={false}
            query={{ q: queryText, author: authorText, hot: params.hot, completed: params.completed, category: params.category, minChapters: params.minChapters, maxChapters: params.maxChapters, hasPolished: params.hasPolished, hasAudio: params.hasAudio, sort: params.sort }}
          />
        </div>
      </div>
    </main>
  );
}
