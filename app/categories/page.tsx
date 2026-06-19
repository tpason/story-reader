import { Layers3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { UserIdentity } from "@/components/UserIdentity";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCachedCategories } from "@/lib/stories";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Thể loại | Linh Quyển Các",
  description: "Duyệt thể loại truyện tiên hiệp, kiếm hiệp, đô thị và nhiều thể loại khác trên Linh Quyển Các.",
};

export default async function CategoriesIndexPage() {
  const categories = await getCachedCategories(100);

  return (
    <main className="app-shell">
      <MotionFX variant="library" />
      <header className="topbar">
        <Link href="/" className="brand">
          <ReaderLogo />
          <span>Linh Quyển Các</span>
        </Link>
        <nav className="topbar-nav" aria-label="Categories navigation">
          <Link href="/">Thư viện</Link>
          <Link href="/discover">Khám phá</Link>
          <Link href="/reading-history">Tàng thư</Link>
        </nav>
        <ThemeToggle />
        <NotificationBell />
        <UserIdentity compact className="topbar-identity" />
      </header>

      <div className="page-wrap">
        <section className="library-header categories-index-header">
          <div>
            <p className="eyebrow">
              <Layers3 size={13} style={{ display: "inline", verticalAlign: "middle" }} aria-hidden="true" />
              {" "}Bản đồ thể loại
            </p>
            <h1 className="library-title">Chọn môn phái truyện</h1>
            <p className="library-subtitle">
              {categories.length} thể loại đang có linh quyển trong Thiên Thư.
            </p>
          </div>
        </section>

        <nav className="category-index-grid" aria-label="Danh sách thể loại">
          {categories.map((category) => (
            <Link key={category.id} className="category-index-card chip" href={`/categories/${category.slug}`}>
              <span className="category-index-name">{category.name}</span>
              <span className="chip-count">{category.storyCount}</span>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
