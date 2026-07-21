"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ReaderLogo } from "@/components/ReaderLogo";
import { SiteHeaderSearch } from "@/components/SiteHeaderSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { UserIdentity } from "@/components/UserIdentity";
import { lockBodyScroll } from "@/lib/body-scroll-lock";

type NavItem = {
  href: Route;
  label: string;
  match: (pathname: string) => boolean;
};

/** Always visible in the desktop track — core destinations. */
const PRIMARY_NAV: NavItem[] = [
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
    href: "/following",
    label: "Tủ truyện",
    match: (pathname) => pathname.startsWith("/following")
  },
  {
    href: "/account",
    label: "Động phủ",
    match: (pathname) => pathname.startsWith("/account")
  }
];

/** Bury behind “Thêm” on desktop; still listed in the mobile drawer. */
const SECONDARY_NAV: NavItem[] = [
  {
    href: "/rankings?tab=betterbox",
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
  }
];

type SiteHeaderProps = {
  className?: string;
  showSearch?: boolean;
};

function NavLinks({
  items,
  pathname,
  className,
  onNavigate
}: {
  items: NavItem[];
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
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

function SecondaryNavMenu({
  pathname,
  onNavigate
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const secondaryActive = SECONDARY_NAV.some((item) => item.match(pathname));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="topbar-modern-more" ref={rootRef}>
      <button
        type="button"
        className={`topbar-modern-link topbar-modern-more-trigger${secondaryActive || open ? " topbar-modern-link-active" : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        Thêm
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open ? (
        <div className="topbar-modern-more-panel" id={menuId} role="menu">
          {SECONDARY_NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className={`topbar-modern-more-link${active ? " topbar-modern-more-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
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
    const unlock = lockBodyScroll();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      unlock();
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
            <NavLinks items={PRIMARY_NAV} pathname={pathname} />
            <SecondaryNavMenu pathname={pathname} />
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
              <NavLinks
                items={PRIMARY_NAV}
                pathname={pathname}
                className="site-header-drawer-link"
                onNavigate={() => setMobileMenuOpen(false)}
              />
              <p className="site-header-drawer-group-label">Thêm</p>
              <NavLinks
                items={SECONDARY_NAV}
                pathname={pathname}
                className="site-header-drawer-link"
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
