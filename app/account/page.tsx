import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { AccountEmailPanel } from "@/components/AccountEmailPanel";
import { MotionFX } from "@/components/MotionFX";
import { SiteHeader } from "@/components/SiteHeader";
import { AccountSectionNav } from "@/components/AccountSectionNav";
import { UserIdentity } from "@/components/UserIdentity";
import { PerformanceModePreference } from "@/components/PerformanceModePreference";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { RealtimeFxPreference } from "@/components/RealtimeFxPreference";

const ProfileShelf = nextDynamic(() => import("@/components/ProfileShelf").then((mod) => mod.ProfileShelf), {
  loading: () => <div className="account-skel-card" aria-hidden="true" />,
});
const ReadingStatsPanel = nextDynamic(() => import("@/components/ReadingStatsPanel").then((mod) => mod.ReadingStatsPanel), {
  loading: () => <div className="account-skel-card" aria-hidden="true" />,
});
const AccountOfflineCachePanel = nextDynamic(
  () => import("@/components/AccountOfflineCachePanel").then((mod) => mod.AccountOfflineCachePanel),
  { loading: () => <div className="account-skel-card account-skel-card-compact" aria-hidden="true" /> },
);
const CultivationPanel = nextDynamic(() => import("@/components/CultivationPanel").then((mod) => mod.CultivationPanel), {
  loading: () => <div className="account-skel-card" aria-hidden="true" />,
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Động phủ",
  description: "Quản lý định danh đạo hữu, tu vi và tùy chọn đọc trên Linh Quyển Các.",
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return (
    <main className="app-shell account-shell">
      <MotionFX variant="library" />
      <SiteHeader />

      <div className="page-wrap account-page-wrap">
        <AccountSectionNav />
        <section className="account-panel">
          <div className="auth-heading account-heading">
            <p className="eyebrow">Động phủ</p>
            <h1>Định danh đạo hữu, khắc tu vi vào Thiên Thư</h1>
            <p>Tán tu vẫn đọc được trên trình duyệt. Sau khi nhập môn, lịch sử đọc và tiến độ tu luyện sẽ được khắc vào Thiên Thư.</p>
          </div>
          <div id="account-identity">
            <UserIdentity panel />
          </div>
          <AccountEmailPanel />
          <section id="account-linh-tin" className="account-linh-tin-block" aria-label="Linh tin">
            <div className="account-linh-tin-heading">
              <p className="eyebrow">Linh tin</p>
              <h2>Thông báo & linh quang</h2>
              <p>Chương mới ngoài tab và hiệu ứng shimmer khi Thiên Thư cập nhật.</p>
            </div>
            <PushNotificationToggle />
            <RealtimeFxPreference />
          </section>
          <section id="account-performance" className="account-performance-block" aria-label="Hiệu năng">
            <PerformanceModePreference />
          </section>
          <div id="account-offline">
            <AccountOfflineCachePanel />
          </div>
          <div id="account-shelf">
            <ProfileShelf />
          </div>
          <div id="account-stats">
            <ReadingStatsPanel />
          </div>
          <div id="account-cultivation">
            <CultivationPanel />
          </div>
        </section>
      </div>
    </main>
  );
}
