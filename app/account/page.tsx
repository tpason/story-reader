import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { AccountAutoPrefsNote } from "@/components/AccountAutoPrefsNote";
import { AccountEmailPanel } from "@/components/AccountEmailPanel";
import { MotionFX } from "@/components/MotionFX";
import { SiteHeader } from "@/components/SiteHeader";
import { AccountSectionNav } from "@/components/AccountSectionNav";
import { UserIdentity } from "@/components/UserIdentity";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

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
            <h1>Định danh đạo hữu</h1>
            <p>Nhập môn để khắc lịch sử đọc vào Thiên Thư. Linh quang và hiệu năng tự chỉnh theo máy.</p>
          </div>
          <div id="account-identity">
            <UserIdentity panel />
          </div>
          <AccountEmailPanel />
          <section id="account-linh-tin" className="account-linh-tin-block" aria-label="Linh tin">
            <div className="account-linh-tin-heading">
              <p className="eyebrow">Linh tin</p>
              <h2>Thông báo chương mới</h2>
              <p>Bật linh tin khi truyện đang theo dõi có chương mới — kể cả ngoài tab.</p>
            </div>
            <PushNotificationToggle />
            <AccountAutoPrefsNote />
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
