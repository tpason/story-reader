import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthorImportClient } from "@/components/author/AuthorImportClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import truyện",
  robots: { index: false, follow: true }
};

export default function AuthorImportPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <div className="page-wrap">
        <AuthorImportClient />
      </div>
    </main>
  );
}
