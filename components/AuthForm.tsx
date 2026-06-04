"use client";

import { animate } from "animejs";
import { BookOpenCheck, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ReaderLogo } from "@/components/ReaderLogo";
import { prefersReducedMotion } from "@/lib/browser";
import { storeCurrentUser, type StoredReaderUser } from "@/lib/identity";
import { useAppDispatch } from "@/lib/store-hooks";
import { persistor, setCurrentUser } from "@/lib/store";
import type { FormEvent } from "react";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) return;

    const animation = animate(panel, {
      y: [18, 0],
      opacity: [0, 1],
      duration: 680,
      ease: "outExpo"
    });

    return () => {
      animation.revert();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        email: form.get("email"),
        password: form.get("password")
      })
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string; user?: StoredReaderUser };

    if (!response.ok) {
      setError(data.error ?? "Không xử lý được yêu cầu.");
      setLoading(false);
      return;
    }

    if (data.user) {
      dispatch(setCurrentUser(data.user));
      storeCurrentUser(data.user);
      await persistor.flush();
    }

    router.push("/");
    router.refresh();
  }

  const isSignup = mode === "signup";

  return (
    <main className="auth-shell">
      <section className="auth-panel" ref={panelRef}>
        <Link href="/" className="brand auth-brand">
          <ReaderLogo />
          <span>Linh Quyển Các</span>
        </Link>

        <div className="auth-heading">
          <span className="auth-icon">{isSignup ? <UserPlus size={22} /> : <LogIn size={22} />}</span>
          <p className="eyebrow">{isSignup ? "Nhập môn" : "Động phủ"}</p>
          <h1>{isSignup ? "Nhập môn để định danh đạo hữu" : "Đăng nhập động phủ"}</h1>
          <p>
            {isSignup
              ? "Tán tu có thể đọc tự do; nhập môn giúp khắc tàng thư, chương đang đọc và tu vi vào Thiên Thư."
              : "Khi đăng nhập, tiến độ tu luyện sẽ được khắc vào Thiên Thư thay vì chỉ lưu ở trình duyệt."}
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Tên tài khoản
            <input name="username" autoComplete="username" minLength={3} maxLength={32} required />
          </label>

          {isSignup ? (
            <label>
              Email
              <input name="email" type="email" autoComplete="email" />
            </label>
          ) : null}

          <label>
            Mật khẩu
            <input name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} required />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <LoaderCircle size={16} className="spin" /> : <BookOpenCheck size={16} />}
            {isSignup ? "Nhập môn" : "Đăng nhập"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Đã có động phủ?" : "Vẫn là tán tu?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Đăng nhập" : "Nhập môn"}</Link>
        </p>
      </section>
    </main>
  );
}
