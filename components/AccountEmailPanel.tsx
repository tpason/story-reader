"use client";

import { LoaderCircle, MailCheck, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store-hooks";
import { storeCurrentUser } from "@/lib/identity";
import { persistor, setCurrentUser } from "@/lib/store";

type EmailPrefs = {
  weeklyDigest: boolean;
  newStoriesDigest: boolean;
  lastWeeklySentAt: string | null;
};

export function AccountEmailPanel() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.identity.user);
  const [email, setEmail] = useState(user?.email ?? "");
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/account/email-preferences");
    const data = (await response.json().catch(() => ({}))) as {
      email?: string | null;
      emailVerified?: boolean;
      preferences?: EmailPrefs;
      error?: string;
    };
    if (response.ok) {
      setEmail(data.email ?? "");
      setPrefs(data.preferences ?? null);
      if (user && typeof data.emailVerified === "boolean") {
        const next = { ...user, email: data.email ?? user.email, emailVerified: data.emailVerified };
        dispatch(setCurrentUser(next));
        storeCurrentUser(next);
      }
    }
    setLoading(false);
  }, [dispatch, user]);

  useEffect(() => {
    if (user) void load();
    else setLoading(false);
  }, [load, user]);

  if (!user) return null;

  async function attachEmail() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = (await response.json().catch(() => ({}))) as {
      user?: typeof user;
      mailWarning?: string;
      error?: string;
    };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Không cập nhật được email.");
      return;
    }
    if (data.user) {
      dispatch(setCurrentUser(data.user));
      storeCurrentUser(data.user);
      await persistor.flush();
    }
    setMessage(data.mailWarning ?? "Đã gửi email xác thực. Kiểm tra hộp thư.");
    await load();
  }

  async function resendVerification() {
    setResending(true);
    setError(null);
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = (await response.json().catch(() => ({}))) as { error?: string; mailWarning?: string };
    setResending(false);
    if (!response.ok) {
      setError(data.error ?? "Không gửi lại được email.");
      return;
    }
    setMessage(data.mailWarning ?? "Đã gửi lại email xác thực.");
  }

  async function savePrefs(patch: Partial<EmailPrefs>) {
    if (!user.emailVerified) {
      setError("Cần xác thực email trước khi bật bản tin.");
      return;
    }
    setSaving(true);
    setError(null);
    const response = await fetch("/api/account/email-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weeklyDigest: patch.weeklyDigest,
        newStoriesDigest: patch.newStoriesDigest
      })
    });
    const data = (await response.json().catch(() => ({}))) as { preferences?: EmailPrefs; error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Không lưu được tùy chọn.");
      return;
    }
    setPrefs(data.preferences ?? null);
    setMessage("Đã lưu tùy chọn email.");
  }

  return (
    <section className="account-email-panel" aria-label="Email và bản tin">
      <div className="account-linh-tin-heading">
        <p className="eyebrow">Thiên thư</p>
        <h2>Email & bản tin tuần</h2>
        <p>Xác thực email để dùng quên mật khẩu và nhận tóm tắt chương mới.</p>
      </div>

      {loading ? <p className="muted">Đang tải…</p> : null}

      {!user.email || !user.emailVerified ? (
        <div className="account-email-verify-block">
          <p className="account-email-banner">
            <MailCheck size={16} aria-hidden />
            {user.email && !user.emailVerified
              ? "Email chưa xác thực — kiểm tra hộp thư hoặc gửi lại."
              : "Gắn email để mở khóa quên mật khẩu và bản tin."}
          </p>
          {!user.emailVerified ? (
            <>
              <label className="auth-portal-field">
                <span className="auth-portal-label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  disabled={Boolean(user.email && user.emailVerified)}
                />
              </label>
              <div className="account-email-actions">
                {!user.email || email !== user.email ? (
                  <button className="chip" type="button" onClick={attachEmail} disabled={saving}>
                    {saving ? <LoaderCircle size={14} className="spin" /> : null}
                    Lưu & gửi xác thực
                  </button>
                ) : null}
                {user.email ? (
                  <button className="chip" type="button" onClick={resendVerification} disabled={resending}>
                    {resending ? <LoaderCircle size={14} className="spin" /> : <Send size={14} />}
                    Gửi lại xác thực
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <p className="account-email-verified">
          <MailCheck size={16} aria-hidden />
          {user.email} — đã xác thực
        </p>
      )}

      {prefs && user.emailVerified ? (
        <div className="account-email-prefs">
          <label className="account-toggle-row">
            <input
              type="checkbox"
              checked={prefs.weeklyDigest}
              onChange={(event) => void savePrefs({ weeklyDigest: event.target.checked })}
            />
            <span>Bản tin chương mới (hàng tuần)</span>
          </label>
          <label className="account-toggle-row">
            <input
              type="checkbox"
              checked={prefs.newStoriesDigest}
              onChange={(event) => void savePrefs({ newStoriesDigest: event.target.checked })}
            />
            <span>Gợi ý truyện mới trong bản tin</span>
          </label>
        </div>
      ) : null}

      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-success">{message}</p> : null}
    </section>
  );
}
