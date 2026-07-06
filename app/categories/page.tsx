import type { Metadata } from "next";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { Layers3 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { XiPageHeroStrip } from "@/components/XiPageHeroStrip";
import { getCachedCategories } from "@/lib/stories";

const MotionFX = nextDynamic(() => import("@/components/MotionFX").then((mod) => mod.MotionFX));

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
      <SiteHeader />

      <div className="page-wrap">
        <XiPageHeroStrip
          className="categories-index-header"
          eyebrow={
            <>
              <Layers3 size={13} aria-hidden="true" />
              Bản đồ thể loại
            </>
          }
          title="Chọn môn phái truyện"
          subtitle={`${categories.length} thể loại đang có linh quyển trong Thiên Thư.`}
        />

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
