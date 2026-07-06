import type { Route } from "next";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { BookOpenCheck, Clock3, Sparkles, WandSparkles } from "lucide-react";
import { DiscoverListClient } from "@/components/DiscoverListClient";
import { SiteHeader } from "@/components/SiteHeader";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { listRecentlyPolishedStoriesPage, listRecentlyUpdatedStoriesPage } from "@/lib/stories";

const MotionFX = nextDynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX));

export const revalidate = 120;

export const metadata = {
  title: "Khám phá nhanh | Linh Quyển Các",
  description: "Truyện vừa polish và chương mới cập nhật trên Linh Quyển Các.",
};

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
      <SiteHeader />

      <div className="page-wrap">
        <XiPageHeroStrip
          className="discover-header"
          eyebrow={
            <>
              <Sparkles size={13} aria-hidden="true" />
              Khám phá nhanh
            </>
          }
          title={kind === "polished" ? "Truyện vừa được polish" : "Truyện vừa cập nhật"}
          subtitle="Theo dõi linh quyển có bản đọc mượt hơn hoặc chương mới vừa khắc vào Thiên Thư."
        >
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
        </XiPageHeroStrip>

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
            <DiscoverListClient items={page.items} kind={kind} />
          ) : (
            <XianxiaEmptyState
              title="Thiên hạ yên tĩnh. Chưa có linh quyển phù hợp bộ lọc."
              hint="Thử bỏ lọc Hôm nay hoặc đổi tab Vừa polish / Vừa cập nhật."
            />
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
