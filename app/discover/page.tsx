import { BookOpenCheck, Clock3, Sparkles, WandSparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { StoryCover } from "@/components/StoryCover";
import { UserIdentity } from "@/components/UserIdentity";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatAbsoluteActivity, formatDiscoveryChapterLabel } from "@/lib/discovery-format";
import { listRecentlyPolishedStoriesPage, listRecentlyUpdatedStoriesPage } from "@/lib/stories";
import { storyHref } from "@/lib/urls";

export const revalidate = 120;

type DiscoverProps = {
  searchParams: Promise<{
    kind?: string;
    page?: string;
    today?: string;
    completed?: string;
  }>;
};

function discoverHref(kind: "polished" | "updated", page: number, today: boolean, completed: boolean | undefined) {
  const params = new URLSearchParams();
  params.set("kind", kind);
  if (page > 1) params.set("page", String(page));
  if (today) params.set("today", "true");
  if (completed === true) params.set("completed", "true");
  else if (completed === false) params.set("completed", "false");
  return `/discover?${params.toString()}` as Route;
}

export default async function DiscoverPage({ searchParams }: DiscoverProps) {
  const params = await searchParams;
  const kind = params.kind === "updated" ? "updated" : "polished";
  const today = params.today === "true";
  const completed: boolean | undefined =
    params.completed === "true" ? true : params.completed === "false" ? false : undefined;
  const currentPage = Math.max(1, Number(params.page ?? 1));
  const pageSize = 18;
  const page =
    kind === "polished"
      ? await listRecentlyPolishedStoriesPage({ page: currentPage, pageSize, today, completed })
      : await listRecentlyUpdatedStoriesPage({ page: currentPage, pageSize, today, completed });
  const Icon = kind === "polished" ? WandSparkles : Clock3;

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <header className="topbar">
        <Link href="/" className="brand">
          <ReaderLogo />
          <span>Linh Quyển Các</span>
        </Link>
        <nav className="topbar-nav" aria-label="Reader navigation">
          <Link href="/">Thư viện</Link>
          <Link href="/reading-history">Tàng thư</Link>
          <Link href="/account">Động phủ</Link>
        </nav>
        <ThemeToggle />
        <UserIdentity compact className="topbar-identity" />
      </header>

      <div className="page-wrap">
        <section className="library-header discover-header">
          <div>
            <p className="eyebrow">Khám phá nhanh</p>
            <h1 className="library-title">{kind === "polished" ? "Truyện vừa được polish" : "Truyện vừa cập nhật"}</h1>
            <p className="library-subtitle">Theo dõi các truyện có bản đọc mượt hơn hoặc chương mới vừa được cập nhật vào Thiên Thư.</p>
          </div>
          <div className="filters discover-tabs">
            <Link className={`chip ${kind === "polished" ? "chip-active" : ""}`} href={discoverHref("polished", 1, today, completed)}>
              <WandSparkles size={15} />
              Vừa polish
            </Link>
            <Link className={`chip ${kind === "updated" ? "chip-active" : ""}`} href={discoverHref("updated", 1, today, completed)}>
              <Clock3 size={15} />
              Vừa cập nhật
            </Link>
            <Link className={`chip ${today ? "chip-active" : ""}`} href={discoverHref(kind, 1, !today, completed)}>
              <Sparkles size={15} />
              Hôm nay
            </Link>
            <Link
              className={`chip ${completed === true ? "chip-active" : ""}`}
              href={discoverHref(kind, 1, today, completed === true ? undefined : true)}
            >
              <BookOpenCheck size={15} />
              Hoàn thành
            </Link>
            <Link
              className={`chip ${completed === false ? "chip-active chip-inverted" : ""}`}
              href={discoverHref(kind, 1, today, completed === false ? undefined : false)}
            >
              Đang viết
            </Link>
          </div>
        </section>

        <section className="library-list-section" aria-label={kind === "polished" ? "Vừa polish" : "Vừa cập nhật"}>
          <div className="section-heading-row story-list-heading">
            <div>
              <p className="eyebrow">{today ? "Trong hôm nay" : "Mới nhất"}{completed === true ? " · Hoàn thành" : completed === false ? " · Đang viết" : " · Tất cả"}</p>
              <h2>{kind === "polished" ? "Bản đọc vừa polish" : "Chương vừa cập nhật"}</h2>
            </div>
            <span className="discovery-badge">
              <Icon size={15} />
              {page.total} truyện
            </span>
          </div>

          {page.items.length > 0 ? (
            <div className="discover-list">
              {page.items.map((story) => (
                <Link className="discover-list-card" href={storyHref(story)} key={story.id}>
                  <StoryCover src={story.coverImageUrl} title={story.title} />
                  <div>
                    <div className="discovery-kicker">
                      <span>{kind === "polished" ? "Vừa polish" : "Chương mới"}</span>
                      <small>{formatAbsoluteActivity(story.latestActivityAt)}</small>
                    </div>
                    <h3>{story.title}</h3>
                    <p>{formatDiscoveryChapterLabel(story)}</p>
                    <div className="discovery-meta">
                      <span>{story.author || "Unknown author"}</span>
                      <span>{story.totalChapters} chương</span>
                      {story.polishedChapterCount > 0 ? <span>{story.polishedChapterCount} chương polish</span> : null}
                      {story.isCompleted ? <span>Hoàn thành</span> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <Icon size={28} />
                <p>Chưa có truyện phù hợp với bộ lọc này.</p>
              </div>
            </div>
          )}

          <nav className="pagination discover-pagination" aria-label="Discovery pagination">
            <Link className={`chip ${page.page <= 1 ? "chip-disabled" : ""}`} href={discoverHref(kind, Math.max(1, page.page - 1), today, completed)} aria-disabled={page.page <= 1}>
              Trước
            </Link>
            <span>
              Trang {page.page} / {page.totalPages}
            </span>
            <Link className={`chip ${page.page >= page.totalPages ? "chip-disabled" : ""}`} href={discoverHref(kind, Math.min(page.totalPages, page.page + 1), today, completed)} aria-disabled={page.page >= page.totalPages}>
              Sau
            </Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
