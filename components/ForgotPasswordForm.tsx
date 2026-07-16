"use client";

import { LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    setMessage(data.message ?? "Nếu email tồn tại và đã xác thực, chúng tôi đã gửi liên kết đặt lại mật khẩu.");
  }

  return (
    <form className="auth-form auth-portal-form" onSubmit={submit}>
      <label className="auth-portal-field">
        <span className="auth-portal-label">Email đã xác thực</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="email@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <p className="auth-portal-lede">
        Chỉ gửi liên kết khi email đã xác thực trên tài khoản. Tài khoản chưa verify hãy vào Động phủ để xác thực trước.
      </p>
      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-success">{message}</p> : null}
      <button className="auth-submit auth-portal-submit" type="submit" disabled={loading}>
        {loading ? <LoaderCircle size={16} className="spin" /> : <Mail size={16} />}
        Gửi liên kết đặt lại
      </button>
      <p className="auth-switch auth-portal-switch">
        <Link href="/login">Quay lại đăng nhập</Link>
      </p>
    </form>
  );
}
