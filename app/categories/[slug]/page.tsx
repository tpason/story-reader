import { Layers3 } from "lucide-react";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MotionFX } from "@/components/MotionFX";
import { SiteHeader } from "@/components/SiteHeader";
import { StoryLibrary } from "@/components/StoryLibrary";
import { XianxiaEmptyState } from "@/components/XianxiaEmptyState";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { buildCategoryMetadata } from "@/lib/metadata";
import { getCategoryBySlug, listStoriesCursor } from "@/lib/stories";

export const revalidate = 300;

type CategorySort = "updated" | "chapters" | "hot" | "title";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return buildCategoryMetadata(category.name, category.storyCount, category.slug);
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort } = await searchParams;

  const validSort: CategorySort | undefined =
    sort === "chapters" || sort === "hot" || sort === "title" || sort === "updated" ? sort : undefined;

  const [category, stories] = await Promise.all([
    getCategoryBySlug(slug),
    listStoriesCursor({ limit: 24, category: slug, sort: validSort }),
  ]);

  if (!category) notFound();

  function sortHref(s: CategorySort) {
    return `/categories/${slug}?sort=${s}` as Route;
  }

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <SiteHeader />

      <div className="page-wrap">
        <XiPageHeroStrip
          eyebrow={
            <>
              <Link href="/" className="category-breadcrumb-link">
                Thư viện
              </Link>
              {" · "}
              <Layers3 size={13} style={{ display: "inline", verticalAlign: "middle" }} aria-hidden="true" /> Thể loại
            </>
          }
          title={category.name}
          subtitle={`${category.storyCount.toLocaleString("vi")} linh quyển trong môn phái này.`}
        >
          <nav className="filters category-sort-row" aria-label="Sắp xếp">
            <Link className={`chip ${!validSort || validSort === "updated" ? "chip-active" : ""}`} href={sortHref("updated")}>
              Mới nhất
            </Link>
            <Link className={`chip ${validSort === "chapters" ? "chip-active" : ""}`} href={sortHref("chapters")}>
              Nhiều chương
            </Link>
            <Link className={`chip ${validSort === "hot" ? "chip-active" : ""}`} href={sortHref("hot")}>
              Đang hot
            </Link>
            <Link className={`chip ${validSort === "title" ? "chip-active" : ""}`} href={sortHref("title")}>
              Tên A–Z
            </Link>
          </nav>
        </XiPageHeroStrip>

        {stories.total === 0 ? (
          <XianxiaEmptyState
            title="Môn phái này chưa có linh quyển."
            hint="Quay lại Thư viện hoặc thử thể loại khác."
          />
        ) : (
          <StoryLibrary
            key={`${slug}-${validSort ?? "updated"}`}
            initialPage={stories}
            mode="browse"
            query={{ category: slug, sort: validSort }}
          />
        )}
      </div>
    </main>
  );
}
