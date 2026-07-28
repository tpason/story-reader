import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { AuthorImportClient } from "@/components/author/AuthorImportClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import chương",
  robots: { index: false, follow: true }
};

type Props = { params: Promise<{ storyId: string }> };

export default async function AuthorStoryImportPage({ params }: Props) {
  const { storyId } = await params;
  return (
    <main className="app-shell">
      <SiteHeader />
      <div className="page-wrap">
        <AuthorImportClient storyId={storyId} />
      </div>
    </main>
  );
}
