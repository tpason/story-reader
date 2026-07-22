import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { MessageCircleHeart } from "lucide-react";
import { CommentRulesNote } from "@/components/CommentRulesNote";
import { SiteHeader } from "@/components/SiteHeader";
import { formatRelativeActivity } from "@/lib/discovery-format";
import { listRecentComments, snippetCommentText } from "@/lib/recent-comments";
import { SITE_NAME } from "@/lib/brand";
import { storyHref } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Luận đạo gần đây · ${SITE_NAME}`,
  description: "Những đạo luận mới nhất trên Thiên Thư — giữ khẩu khí thanh khiết.",
  alternates: { canonical: "/dao-luan" }
};

export default async function DaoLuanPage() {
  let items: Awaited<ReturnType<typeof listRecentComments>> = [];
  try {
    items = await listRecentComments(40);
  } catch {
    items = [];
  }

  return (
    <main className="app-shell">
      <SiteHeader />
      <div className="page-wrap dao-luan-page">
        <section className="dao-luan-header">
          <p className="eyebrow">Thiên Thư · cộng đồng</p>
          <h1>
            <MessageCircleHeart size={28} aria-hidden />
            Luận đạo gần đây
          </h1>
          <p>Bốn mươi đạo luận mới nhất — mở chương để tiếp tục đàm đạo.</p>
          <CommentRulesNote variant="list" />
        </section>

        {items.length === 0 ? (
          <p className="dao-luan-empty">Chưa có đạo luận nào được khắc gần đây.</p>
        ) : (
          <ul className="dao-luan-list">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  className="recent-comment-card dao-luan-card"
                  href={storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber)}
                  prefetch={false}
                >
                  <div className="recent-comment-kicker">
                    <span>{item.authorUsername || "Đạo hữu"}</span>
                    <small>
                      <time dateTime={item.createdAt}>{formatRelativeActivity(item.createdAt)}</time>
                    </small>
                  </div>
                  <p className="recent-comment-snippet">{snippetCommentText(item.contentText, 220)}</p>
                  <div className="recent-comment-meta">
                    <strong>{item.storyTitle}</strong>
                    <span>Chương {item.chapterNumber}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="dao-luan-back">
          <Link className="chip" href={"/" as Route}>
            Về Linh Quyển Đại Thư
          </Link>
        </p>
      </div>
    </main>
  );
}
