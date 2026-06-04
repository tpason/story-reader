import { CheckCircle2, Flame, Headphones, Layers3, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { listCategories, listRecentlyPolishedStories, listRecentlyUpdatedStories, listStoriesCursor } from "@/lib/stories";
import { StoryLibrary } from "@/components/StoryLibrary";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { UserIdentity } from "@/components/UserIdentity";
import { StoryDiscoveryRail } from "@/components/StoryDiscoveryRail";
import { FollowedStoriesPanel } from "@/components/FollowedStoriesPanel";
import { NotificationBell } from "@/components/NotificationBell";
import { HeroCloudClient } from "@/components/HeroCloudClient";
import { XianxiaPoetryColumn } from "@/components/XianxiaPoetryColumn";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    hot?: string;
    completed?: string;
    category?: string;
    minChapters?: string;
    maxChapters?: string;
    hasPolished?: string;
    hasAudio?: string;
    sort?: string;
  }>;
};

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query.toString();
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const libraryKey = JSON.stringify({
    q: params.q ?? "",
    hot: params.hot ?? "",
    completed: params.completed ?? "",
    category: params.category ?? "",
    minChapters: params.minChapters ?? "",
    maxChapters: params.maxChapters ?? "",
    hasPolished: params.hasPolished ?? "",
    hasAudio: params.hasAudio ?? "",
    sort: params.sort ?? ""
  });
  const [stories, categories, polishedStories, updatedStories] = await Promise.all([
    listStoriesCursor({
      limit: 24,
      queryText: params.q,
      hot: params.hot === "true",
      completed: params.completed === "true" ? true : undefined,
      category: params.category,
      minChapters: Number(params.minChapters) > 0 ? Number(params.minChapters) : undefined,
      maxChapters: Number(params.maxChapters) > 0 ? Number(params.maxChapters) : undefined,
      hasPolished: params.hasPolished === "true",
      hasAudio: params.hasAudio === "true",
      sort: params.sort === "chapters" || params.sort === "hot" || params.sort === "title" || params.sort === "updated" ? params.sort : undefined
    }),
    listCategories(12),
    listRecentlyPolishedStories(8),
    listRecentlyUpdatedStories(8)
  ]);

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <header className="topbar">
        <Link href="/" className="brand">
          <ReaderLogo />
          <span>Linh Quyển Các</span>
        </Link>
        <nav className="topbar-nav" aria-label="Reader navigation">
          <Link href="/updates">Chương mới</Link>
          <Link href="/reading-history">Tàng thư</Link>
          <Link href="/account">Động phủ</Link>
        </nav>
        <NotificationBell />
        <UserIdentity compact className="topbar-identity" />
      </header>

      <div className="page-wrap">
        <section className="library-header">
          <XianxiaPoetryColumn />
          <div className="library-hero-shell" style={{backdropFilter: "blur(1px)"}}>
            <HeroCloudClient />
            {/* SVG filter — organic cloud edge via feTurbulence displacement */}
            <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
              <defs>
                <filter id="xi-cloud-f" x="-35%" y="-35%" width="170%" height="170%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.016 0.020" numOctaves="4" seed="12" result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="32" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
            </svg>
            <div className="xi-hero-cloud">
              <div className="xi-hero-cloud-bg" aria-hidden="true" />
              <div className="library-hero-content">
                <p className="eyebrow" style={{ textAlign: "center", paddingLeft: "20px" }}>Linh quyển các</p>
                <h1 className="library-title" style={{ textAlign: "center", }}>Tu tiên từng chương. Vươn tới đỉnh trời.</h1>
                <p className="library-subtitle">
                  Tán tu du đạo — đọc ngay, không cần nhập môn. Kết bái đạo hữu để định danh linh hồn và lưu hành trình tu luyện vào Thiên Thư.
                </p>
              </div>
            </div>
          </div>

          <form className="filters library-search">
            <input className="search-input" name="q" defaultValue={params.q ?? ""} placeholder="Tìm truyện hoặc tác giả" aria-label="Tìm truyện hoặc tác giả" />
            <input type="hidden" name="category" value={params.category ?? ""} />
            <button className="chip" type="submit">
              <Search size={15} />
              Tìm
            </button>
            <Link className={`chip ${params.hot === "true" ? "chip-active" : ""}`} href={`/?${buildQuery({ q: params.q, category: params.category, hot: params.hot === "true" ? undefined : "true", completed: params.completed, minChapters: params.minChapters, maxChapters: params.maxChapters, hasPolished: params.hasPolished, hasAudio: params.hasAudio, sort: params.sort })}`}>
              <Flame size={15} />
              Hot
            </Link>
            <Link className={`chip ${params.completed === "true" ? "chip-active" : ""}`} href={`/?${buildQuery({ q: params.q, category: params.category, hot: params.hot, completed: params.completed === "true" ? undefined : "true", minChapters: params.minChapters, maxChapters: params.maxChapters, hasPolished: params.hasPolished, hasAudio: params.hasAudio, sort: params.sort })}`}>
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
                    <option value="hot">Đang hot</option>
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
        </section>

        {categories.length > 0 ? (
          <nav className="filters category-row" aria-label="Categories">
            <a className={`chip ${!params.category ? "chip-active" : ""}`} href={`/?${buildQuery({ q: params.q, hot: params.hot, completed: params.completed, minChapters: params.minChapters, maxChapters: params.maxChapters, hasPolished: params.hasPolished, hasAudio: params.hasAudio, sort: params.sort })}`}>
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
          </nav>
        ) : null}

        <StoryDiscoveryRail polishedStories={polishedStories} updatedStories={updatedStories} />
        <FollowedStoriesPanel />

        <StoryLibrary key={libraryKey} initialPage={stories} query={{ q: params.q, hot: params.hot, completed: params.completed, category: params.category, minChapters: params.minChapters, maxChapters: params.maxChapters, hasPolished: params.hasPolished, hasAudio: params.hasAudio, sort: params.sort }} />
      </div>
    </main>
  );
}
