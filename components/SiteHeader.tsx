"use client";

import { Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ReaderLogo } from "@/components/ReaderLogo";
import { SiteHeaderSearch } from "@/components/SiteHeaderSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { UserIdentity } from "@/components/UserIdentity";

type NavItem = {
  href: Route;
  label: string;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Thư viện",
    match: (pathname) =>
      pathname === "/" || pathname.startsWith("/categories") || pathname.startsWith("/stories/")
  },
  {
    href: "/discover",
    label: "Khám phá",
    match: (pathname) => pathname.startsWith("/discover")
  },
  {
    href: "/rankings",
    label: "Thiên bảng",
    match: (pathname) => pathname.startsWith("/rankings")
  },
  {
    href: "/updates",
    label: "Chương mới",
    match: (pathname) => pathname.startsWith("/updates")
  },
  {
    href: "/reading-history",
    label: "Tàng thư",
    match: (pathname) => pathname.startsWith("/reading-history")
  },
  {
    href: "/account",
    label: "Động phủ",
    match: (pathname) => pathname.startsWith("/account")
  }
];

type SiteHeaderProps = {
  className?: string;
  showSearch?: boolean;
};

function NavLinks({
  pathname,
  className,
  onNavigate
}: {
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`topbar-modern-link${active ? " topbar-modern-link-active" : ""}${className ? ` ${className}` : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function SiteHeader({ className, showSearch = true }: SiteHeaderProps) {
  const pathname = usePathname() ?? "/";
  const onStoryPage = pathname.startsWith("/stories/");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`topbar topbar-modern${className ? ` ${className}` : ""}`}
      data-on-story={onStoryPage ? "true" : undefined}
      data-menu-open={mobileMenuOpen ? "true" : undefined}
    >
      <div className="topbar-modern-inner">
        <button
          type="button"
          className="site-header-menu-btn"
          aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng"}
          aria-expanded={mobileMenuOpen}
          aria-controls="site-header-drawer"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link href="/" className="brand topbar-modern-brand">
          <ReaderLogo />
          <span className="topbar-modern-wordmark">Linh Quyển Các</span>
        </Link>

        {showSearch ? (
          <div className="topbar-modern-search">
            <SiteHeaderSearch />
          </div>
        ) : null}

        <nav className="topbar-nav topbar-modern-nav" aria-label="Reader navigation">
          <div className="topbar-modern-nav-track">
            <NavLinks pathname={pathname} />
          </div>
        </nav>

        <div className="topbar-modern-actions">
          <div className="topbar-modern-utils">
            <ThemeToggle />
            <NotificationBell />
          </div>
          <UserIdentity compact className="topbar-identity" />
        </div>
      </div>

      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="site-header-drawer-backdrop"
            aria-label="Đóng menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav id="site-header-drawer" className="site-header-drawer" aria-label="Menu điều hướng">
            <div className="site-header-drawer-header">
              <p className="eyebrow">Linh Quyển Các</p>
              <strong>Điều hướng</strong>
            </div>
            <div className="site-header-drawer-links">
              <NavLinks pathname={pathname} className="site-header-drawer-link" onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
