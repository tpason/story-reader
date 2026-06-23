"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReaderLogo } from "@/components/ReaderLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { UserIdentity } from "@/components/UserIdentity";

type NavItem = {
  href: string;
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
};

export function SiteHeader({ className }: SiteHeaderProps) {
  const pathname = usePathname() ?? "/";
  const onStoryPage = pathname.startsWith("/stories/");

  return (
    <header
      className={`topbar topbar-modern${className ? ` ${className}` : ""}`}
      data-on-story={onStoryPage ? "true" : undefined}
    >
      <div className="topbar-modern-inner">
        <Link href="/" className="brand topbar-modern-brand">
          <ReaderLogo />
          <span className="topbar-modern-wordmark">Linh Quyển Các</span>
        </Link>

        <nav className="topbar-nav topbar-modern-nav" aria-label="Reader navigation">
          <div className="topbar-modern-nav-track">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`topbar-modern-link${active ? " topbar-modern-link-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="topbar-modern-actions">
          <ThemeToggle />
          <NotificationBell />
          <UserIdentity compact className="topbar-identity" />
        </div>
      </div>
    </header>
  );
}
