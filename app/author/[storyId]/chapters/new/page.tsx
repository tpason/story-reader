import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthorChapterEditorClient } from "@/components/author/AuthorChapterEditorClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chương mới",
  robots: { index: false, follow: true }
};

export default function AuthorNewChapterPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <div className="page-wrap">
        <AuthorChapterEditorClient mode="new" />
      </div>
    </main>
  );
}
