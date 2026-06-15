import Link from "next/link";
import { MotionFX } from "@/components/MotionFX";
import { ReaderLogo } from "@/components/ReaderLogo";
import { CultivationPanel } from "@/components/CultivationPanel";
import { UserIdentity } from "@/components/UserIdentity";
import { ProfileShelf } from "@/components/ProfileShelf";
import { ReadingStatsPanel } from "@/components/ReadingStatsPanel";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <main className="auth-shell">
      <MotionFX variant="error" />
      <section className="auth-panel">
        <Link href="/" className="brand auth-brand">
          <ReaderLogo />
          <span>Linh Quyển Các</span>
        </Link>
        <div className="auth-heading">
          <p className="eyebrow">Động phủ</p>
          <h1>Định danh đạo hữu, khắc tu vi vào Thiên Thư</h1>
          <p>Tán tu vẫn đọc được trên trình duyệt. Sau khi nhập môn, lịch sử đọc và tiến độ tu luyện sẽ được khắc vào Thiên Thư.</p>
        </div>
        <UserIdentity panel />
        <ProfileShelf />
        <CultivationPanel />
        <ReadingStatsPanel />
      </section>
    </main>
  );
}
