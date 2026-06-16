import { BookOpen, Layers3 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { UserIdentity } from "@/components/UserIdentity";
import { NotificationBell } from "@/components/NotificationBell";
import { StoryLibrary } from "@/components/StoryLibrary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCategoryBySlug, listStoriesCursor } from "@/lib/stories";

export const dynamic = "force-dynamic";

type CategorySort = "updated" | "chapters" | "hot" | "title";

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
      <header className="topbar">
        <Link href="/" className="brand">
          <ReaderLogo />
          <span>Linh Quyển Các</span>
        </Link>
        <nav className="topbar-nav" aria-label="Category navigation">
          <Link href="/">Thư viện</Link>
          <Link href="/discover">Khám phá</Link>
          <Link href="/reading-history">Tàng thư</Link>
        </nav>
        <ThemeToggle />
        <NotificationBell />
        <UserIdentity compact className="topbar-identity" />
      </header>

      <div className="page-wrap">
        <section className="library-header">
          <div>
            <p className="eyebrow">
              <Link href="/" className="category-breadcrumb-link">Thư viện</Link>
              {" · "}
              <Layers3 size={13} style={{ display: "inline", verticalAlign: "middle" }} aria-hidden="true" />
              {" "}Thể loại
            </p>
            <h1 className="library-title">{category.name}</h1>
            <p className="library-subtitle">
              {category.storyCount.toLocaleString("vi")} truyện trong thể loại này.
            </p>
          </div>

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
        </section>

        {stories.total === 0 ? (
          <div className="empty-state">
            <div>
              <BookOpen size={28} />
              <p>Chưa có truyện nào trong thể loại này.</p>
            </div>
          </div>
        ) : (
          <StoryLibrary
            key={`${slug}-${validSort ?? "updated"}`}
            initialPage={stories}
            query={{ category: slug, sort: validSort }}
          />
        )}
      </div>
    </main>
  );
}
