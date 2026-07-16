"use client";

import { animate } from "animejs";
import { BookOpenCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ReaderLogo } from "@/components/ReaderLogo";
import { XiDisplayFontScope } from "@/components/XiDisplayFontScope";
import { prefersReducedMotion } from "@/lib/browser";
import { storeCurrentUser, type StoredReaderUser } from "@/lib/identity";
import { useAppDispatch } from "@/lib/store-hooks";
import { persistor, setCurrentUser } from "@/lib/store";
import type { FormEvent } from "react";

type AuthFormProps = {
  mode: "login" | "signup";
};

const PORTAL_NAV = [
  { href: "/", label: "Thư viện" },
  { href: "/discover", label: "Khám phá" },
  { href: "/reading-history", label: "Tàng thư" }
] as const;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.matchMedia("(max-width: 839px)").matches) return;

    const panel = panelRef.current;
    const hero = heroRef.current;

    const panelAnimation = panel
      ? animate(panel, {
          y: [22, 0],
          opacity: [0, 1],
          duration: 720,
          ease: "outExpo"
        })
      : null;

    const heroAnimation = hero
      ? animate(hero, {
          opacity: [0, 1],
          x: [-16, 0],
          duration: 900,
          ease: "outExpo"
        })
      : null;

    return () => {
      panelAnimation?.revert();
      heroAnimation?.revert();
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

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      user?: StoredReaderUser;
      mailWarning?: string;
    };

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

    if (isSignup && data.mailWarning) {
      router.push(`/account?verify=sent&warn=${encodeURIComponent(data.mailWarning)}`);
      router.refresh();
      return;
    }

    router.push(isSignup && !data.user?.emailVerified ? "/account?verify=sent" : "/");
    router.refresh();
  }

  const isSignup = mode === "signup";

  return (
    <main className="auth-shell auth-shell--portal">
      <div className="auth-portal-backdrop" aria-hidden>
        <span className="auth-portal-mist auth-portal-mist--a" />
        <span className="auth-portal-mist auth-portal-mist--b" />
        <span className="auth-portal-ridge" />
      </div>

      <header className="auth-portal-topbar">
        <Link href="/" className="brand auth-portal-brand">
          <ReaderLogo />
          <span className="auth-portal-brand-text">
            Linh Quyển Các
            <small>Động phủ</small>
          </span>
        </Link>

        <nav className="auth-portal-nav" aria-label="Điều hướng nhanh">
          {PORTAL_NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="auth-portal-stage">
        <aside className="auth-portal-hero" ref={heroRef} aria-hidden>
          <XiDisplayFontScope>
            <blockquote className="auth-portal-quote">
              <span>Truyện hay</span>
              <span>khai mở</span>
              <span>linh quyển</span>
            </blockquote>
          </XiDisplayFontScope>
          <p className="auth-portal-quote-en">Good Stories Inspire more cultivators.</p>
        </aside>

        <section className="auth-panel auth-portal-panel" ref={panelRef}>
          <div className="auth-portal-tabs" role="tablist" aria-label="Chọn hình thức vào môn">
            <Link
              href="/login"
              className={`auth-portal-tab${isSignup ? "" : " auth-portal-tab--active"}`}
              role="tab"
              aria-selected={!isSignup}
            >
              <span className="auth-portal-tab-long">Đăng nhập động phủ</span>
              <span className="auth-portal-tab-short" aria-hidden="true">
                Đăng nhập
              </span>
            </Link>
            <Link
              href="/signup"
              className={`auth-portal-tab${isSignup ? " auth-portal-tab--active" : ""}`}
              role="tab"
              aria-selected={isSignup}
            >
              Nhập môn
            </Link>
          </div>

          <div className="auth-heading auth-portal-heading">
            <h1>{isSignup ? "Nhập môn để định danh đạo hữu" : "Đăng nhập động phủ"}</h1>
            <p className="auth-portal-lede">
              {isSignup
                ? "Tán tu có thể đọc tự do; nhập môn giúp khắc tàng thư, chương đang đọc và tu vi vào Thiên Thư."
                : "Khi đăng nhập, tiến độ tu luyện sẽ được khắc vào Thiên Thư thay vì chỉ lưu ở trình duyệt."}
            </p>
          </div>

          <form className="auth-form auth-portal-form" onSubmit={submit}>
            <label className="auth-portal-field">
              <span className="auth-portal-label">
                {isSignup ? "Tên tài khoản" : "Tên tài khoản hoặc email"}
              </span>
              <input
                name="username"
                autoComplete="username"
                minLength={3}
                maxLength={isSignup ? 32 : 254}
                pattern={isSignup ? "[^@]+" : undefined}
                title={isSignup ? "Tên tài khoản không được chứa @" : undefined}
                placeholder={isSignup ? "Nhập tên đạo hữu" : "username hoặc email@example.com"}
                required
              />
            </label>

            {isSignup ? (
              <label className="auth-portal-field">
                <span className="auth-portal-label">Email (bắt buộc)</span>
                <input name="email" type="email" autoComplete="email" placeholder="email@example.com" required />
              </label>
            ) : null}

            <label className="auth-portal-field">
              <span className="auth-portal-label">Mật khẩu</span>
              <input
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={8}
                placeholder={isSignup ? "Tối thiểu 8 ký tự" : "Nhập mật khẩu"}
                required
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}

            <button className="auth-submit auth-portal-submit" type="submit" disabled={loading}>
              {loading ? <LoaderCircle size={16} className="spin" /> : <BookOpenCheck size={16} />}
              {isSignup ? "Nhập môn" : "Đăng nhập"}
            </button>
          </form>

          {!isSignup ? (
            <p className="auth-switch auth-portal-switch">
              <Link href="/forgot-password">Quên mật khẩu?</Link>
            </p>
          ) : null}

          <p className="auth-switch auth-portal-switch">
            {isSignup ? "Đã có động phủ?" : "Vẫn là tán tu?"}{" "}
            <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Đăng nhập" : "Nhập môn"}</Link>
          </p>
        </section>
      </div>

      <footer className="auth-portal-footer">
        <p>© {new Date().getFullYear()} Linh Quyển Các — tu tiên từng chương</p>
      </footer>
    </main>
  );
}
