import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthorWorksClient } from "@/components/author/AuthorWorksClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Linh các viết",
  description: "Tự đăng truyện và quản lý chương trên Linh Quyển Các.",
  robots: { index: false, follow: true }
};

export default function AuthorIndexPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <div className="page-wrap">
        <AuthorWorksClient />
      </div>
    </main>
  );
}
