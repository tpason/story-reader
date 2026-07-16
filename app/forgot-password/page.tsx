import { AuthForm } from "@/components/AuthForm";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-shell auth-shell--portal">
      <div className="auth-portal-backdrop" aria-hidden />
      <div className="auth-portal-stage auth-portal-stage--compact">
        <section className="auth-panel auth-portal-panel">
          <div className="auth-heading auth-portal-heading">
            <h1>Quên mật khẩu</h1>
            <p className="auth-portal-lede">Nhập email đã xác thực để nhận liên kết đặt lại mật khẩu.</p>
          </div>
          <ForgotPasswordForm />
        </section>
      </div>
    </main>
  );
}
