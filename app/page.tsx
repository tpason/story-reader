import type { Route } from "next";
import type { Metadata } from "next";
import { CheckCircle2, Flame, Headphones, Layers3, Sparkles, Trophy, X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { getCachedCategories, getCachedPolishedStories, getCachedUpdatedStories, listStoriesCursor } from "@/lib/stories";
import { buildHomeFilterLabels, isHomeSearchActive } from "@/lib/home-search";
import { LibrarySortChips } from "@/components/LibrarySortChips";
import { StoryLibrary } from "@/components/StoryLibrary";
import { ReadingResumeBar } from "@/components/ReadingResumeBar";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryDiscoveryRail } from "@/components/StoryDiscoveryRail";
import { DiscoveryRailSkeleton } from "@/components/DiscoveryRailSkeleton";
import { XianxiaPoetryColumn } from "@/components/XianxiaPoetryColumn";
import { JsonLdScript } from "@/components/JsonLdScript";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_DESCRIPTION } from "@/lib/brand";
import { buildHomeJsonLd } from "@/lib/json-ld";

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

async function DiscoverySection() {
  // Same card budget per column — avoids tall empty polish slab vs dense updates.
  const [polishedStories, updatedStories] = await Promise.all([
    getCachedPolishedStories(5),
    getCachedUpdatedStories(5),
  ]);
  return <StoryDiscoveryRail polishedStories={polishedStories} updatedStories={updatedStories} />;
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

  const [stories, categories] = await Promise.all([
    listStoriesCursor({
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

  return (
    <main className="app-shell">
      <JsonLdScript data={buildHomeJsonLd()} />
      <MotionFX variant="library" />
      <SiteHeader />

      <div className="page-wrap" data-search-active={isSearchActive ? "true" : undefined}>
        {/*
          Bookstore IA (Fanqie/Kakao/Qidian synthesis):
          singular resume (+ recent chips) → follows rail-or-nothing → compact brand
          → one discovery surface → cultivation → sticky catalog (all filters)
          Trending stays on /rankings + /discover.
        */}
        {!isSearchActive ? (
          <div className="home-priority-rail" aria-label="Tu luyện đang mở">
            <ReadingResumeBar showRecentRail />
            <section className="home-follows-block" aria-label="Tủ truyện đang theo">
              <FollowedStoriesPanel />
            </section>
          </div>
        ) : null}

        <section className="library-header library-header--compact">
          <svg aria-hidden="true" className="xi-cloud-filters" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
            <defs>
              <filter id="xi-cloud-f" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.014 0.018" numOctaves="3" seed="12" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <filter id="xi-cloud-f-alt" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.016 0.020" numOctaves="3" seed="28" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>
          {!isSearchActive ? (
            <>
              <XianxiaPoetryColumn />
              <div className="library-hero-shell library-hero-shell-modern library-hero-shell--compact">
                <div className="xi-hero-cloud library-hero-cloud-modern">
                  <div className="xi-hero-cloud-bg xi-cloud-aura xi-cloud-aura--primary" role="presentation" />
                  <div className="library-hero-content library-hero-content-modern">
                    <p className="eyebrow library-hero-eyebrow">Linh quyển các · Thiên Thư</p>
                    <h1 className="library-title library-title-centered library-title-modern">
                      Tu tiên từng chương.<span>Vươn tới đỉnh trời.</span>
                    </h1>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="library-search-hero" aria-live="polite">
              <p className="eyebrow">Tìm trong Thiên Thư</p>
              <h1 className="library-search-hero-title">
                {queryText ? `“${queryText}”` : "Kết quả lọc"}
              </h1>
              <p className="library-search-hero-sub">
                {stories.total ?? stories.items.length} linh quyển phù hợp
              </p>
            </div>
          )}
        </section>

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
          <div className="home-story-flow home-story-flow--single">
            <Suspense fallback={<DiscoveryRailSkeleton />}>
              <DiscoverySection />
            </Suspense>
            <p className="home-discovery-jump">
              <Link className="chip" href={"/rankings?tab=trending" as Route}>
                <Trophy size={14} aria-hidden />
                Thiên bảng thịnh hành
              </Link>
              <Link className="chip" href="/discover">
                <Sparkles size={14} aria-hidden />
                Khám phá thêm
              </Link>
            </p>
          </div>
        )}

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
                    Có polish
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
