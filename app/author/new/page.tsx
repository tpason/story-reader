import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthorNewStoryClient } from "@/components/author/AuthorNewStoryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tạo truyện",
  robots: { index: false, follow: true }
};

export default function AuthorNewPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <div className="page-wrap">
        <AuthorNewStoryClient />
      </div>
    </main>
  );
}
