import type { ReactNode } from "react";
import Link from "next/link";
import { MessageCircle, Sparkles } from "lucide-react";
import { COMMENT_RULES_SHORT } from "@/lib/comment-rules";

/**
 * Slot after discovery / before library filters.
 * Homepage passes sibling `RecentCommentsRail` when present; teaser fills the gap otherwise.
 */
type HomeSocialSlotProps = {
  commentsRail?: ReactNode;
};

function ThienThuTeaser() {
  return (
    <div className="home-thien-thu-teaser">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">Thiên Thư gần đây</p>
          <h2>Nhịp cập nhật & luận đạo</h2>
          <p className="home-thien-thu-teaser-copy">{COMMENT_RULES_SHORT}</p>
        </div>
        <Link className="discovery-more" href="/updates">
          <Sparkles size={15} />
          Chương mới
        </Link>
      </div>
      <div className="home-thien-thu-teaser-cards">
        <Link className="home-thien-thu-card" href="/updates">
          <Sparkles size={16} aria-hidden />
          <span>
            <strong>Chương vừa ấn định</strong>
            <small>Theo dõi linh khí dịch chuyển trong thư viện</small>
          </span>
        </Link>
        <Link className="home-thien-thu-card" href="/discover?kind=updated">
          <MessageCircle size={16} aria-hidden />
          <span>
            <strong>Khám phá cập nhật</strong>
            <small>Rail chương mới — luận đạo gắn khi có hơi thở đạo hữu</small>
          </span>
        </Link>
      </div>
    </div>
  );
}

export function HomeSocialSlot({ commentsRail }: HomeSocialSlotProps) {
  return (
    <div className="home-social-slot" data-has-rail={commentsRail ? "true" : "false"}>
      {commentsRail ?? <ThienThuTeaser />}
    </div>
  );
}
