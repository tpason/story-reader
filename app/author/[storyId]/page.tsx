import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthorStoryStudioClient } from "@/components/author/AuthorStoryStudioClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio truyện",
  robots: { index: false, follow: true }
};

export default function AuthorStoryPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <div className="page-wrap">
        <AuthorStoryStudioClient />
      </div>
    </main>
  );
}
