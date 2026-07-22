import { MessageCircleHeart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CommentRulesNote } from "@/components/CommentRulesNote";
import { formatRelativeActivity } from "@/lib/discovery-format";
import {
  getCachedRecentComments,
  snippetCommentText,
  type RecentCommentItem
} from "@/lib/recent-comments";
import { storyHref } from "@/lib/urls";

function commentHref(item: RecentCommentItem): Route {
  return storyHref({ id: item.storyId, title: item.storyTitle }, item.chapterNumber);
}

export async function RecentCommentsRail({ limit = 10 }: { limit?: number }) {
  let items: RecentCommentItem[] = [];
  try {
    items = await getCachedRecentComments(limit);
  } catch {
    items = [];
  }

  // Never return null — HomeSocialSlot treats a present rail node as filled;
  // an empty/error DB should still show a compact discovery-shaped panel.
  return (
    <section className="discovery-section recent-comments-section" aria-label="Luận đạo gần đây">
      <div className="discovery-section-title">
        <MessageCircleHeart size={17} aria-hidden />
        <span>Luận đạo gần đây</span>
      </div>

      <div className="discovery-panel recent-comments-panel">
        <div className="section-heading-row discovery-heading">
          <div>
            <p className="eyebrow">Hương lửa đạo hữu</p>
            <h2>Vừa luận trên Thiên Thư</h2>
            <p>
              {items.length > 0
                ? "Nghe hơi thở của tàng thư — mở chương để tiếp tục đàm đạo."
                : "Chưa có đạo luận mới — hãy là người mở lời đầu tiên trên Thiên Thư."}
            </p>
            <CommentRulesNote variant="compact" className="recent-comments-rules" />
          </div>
          <Link className="discovery-more" href={(items.length > 0 ? "/dao-luan" : "/updates") as Route}>
            <MessageCircleHeart size={15} aria-hidden />
            {items.length > 0 ? "Xem thêm" : "Chương mới"}
          </Link>
        </div>

        {items.length > 0 ? (
          <div className="discovery-row recent-comments-row">
            {items.map((item) => (
              <Link
                key={item.id}
                className="recent-comment-card"
                href={commentHref(item)}
                prefetch={false}
              >
                <div className="recent-comment-kicker">
                  <span>{item.authorUsername || "Đạo hữu"}</span>
                  <small>
                    <time dateTime={item.createdAt}>{formatRelativeActivity(item.createdAt)}</time>
                  </small>
                </div>
                <p className="recent-comment-snippet">{snippetCommentText(item.contentText)}</p>
                <div className="recent-comment-meta">
                  <strong>{item.storyTitle}</strong>
                  <span>Chương {item.chapterNumber}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
