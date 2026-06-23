import { MotionFX } from "@/components/MotionFX";
import { SiteHeader } from "@/components/SiteHeader";
import { CultivationPanel } from "@/components/CultivationPanel";
import { UserIdentity } from "@/components/UserIdentity";
import { ProfileShelf } from "@/components/ProfileShelf";
import { PerformanceModePreference } from "@/components/PerformanceModePreference";
import { AccountOfflineCachePanel } from "@/components/AccountOfflineCachePanel";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { RealtimeFxPreference } from "@/components/RealtimeFxPreference";
import { ReadingStatsPanel } from "@/components/ReadingStatsPanel";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <main className="auth-shell">
      <MotionFX variant="error" />
      <SiteHeader className="account-topbar" />

      <section className="auth-panel">
        <div className="auth-heading">
          <p className="eyebrow">Động phủ</p>
          <h1>Định danh đạo hữu, khắc tu vi vào Thiên Thư</h1>
          <p>Tán tu vẫn đọc được trên trình duyệt. Sau khi nhập môn, lịch sử đọc và tiến độ tu luyện sẽ được khắc vào Thiên Thư.</p>
        </div>
        <UserIdentity panel />
        <section className="account-linh-tin-block" aria-label="Linh tin">
          <div className="account-linh-tin-heading">
            <p className="eyebrow">Linh tin</p>
            <h2>Thông báo & linh quang</h2>
            <p>Chương mới ngoài tab và hiệu ứng shimmer khi Thiên Thư cập nhật.</p>
          </div>
          <PushNotificationToggle />
          <RealtimeFxPreference />
        </section>
        <section className="account-performance-block" aria-label="Hiệu năng">
          <PerformanceModePreference />
        </section>
        <AccountOfflineCachePanel />
        <ProfileShelf />
        <ReadingStatsPanel />
        <CultivationPanel />
      </section>
    </main>
  );
}
