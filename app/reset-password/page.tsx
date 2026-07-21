import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu",
  description: "Chọn mật khẩu mới cho động phủ Linh Quyển Các.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="auth-shell auth-shell--portal">
      <div className="auth-portal-backdrop" aria-hidden />
      <div className="auth-portal-stage auth-portal-stage--compact">
        <section className="auth-panel auth-portal-panel">
          <div className="auth-heading auth-portal-heading">
            <h1>Đặt lại mật khẩu</h1>
            <p className="auth-portal-lede">Chọn mật khẩu mới cho động phủ của bạn.</p>
          </div>
          <Suspense fallback={<p className="muted">Đang tải…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
