"use client";

import { BookOpenCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Liên kết không hợp lệ.");
      return;
    }
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Không đặt lại được mật khẩu.");
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <p className="auth-error">
        Liên kết không hợp lệ. <Link href="/forgot-password">Yêu cầu liên kết mới</Link>
      </p>
    );
  }

  if (done) {
    return (
      <div className="auth-form auth-portal-form">
        <p className="auth-success">Mật khẩu đã được đặt lại. Hãy đăng nhập lại.</p>
        <Link className="auth-submit auth-portal-submit" href="/login">
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form auth-portal-form" onSubmit={submit}>
      <label className="auth-portal-field">
        <span className="auth-portal-label">Mật khẩu mới</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="Tối thiểu 8 ký tự"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error ? <p className="auth-error">{error}</p> : null}
      <button className="auth-submit auth-portal-submit" type="submit" disabled={loading}>
        {loading ? <LoaderCircle size={16} className="spin" /> : <BookOpenCheck size={16} />}
        Đặt lại mật khẩu
      </button>
    </form>
  );
}
