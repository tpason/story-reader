"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";

type FooterLink = {
  href: Route;
  label: string;
  match: (pathname: string) => boolean;
};

type FooterGroup = {
  label: string;
  links: FooterLink[];
};

/** CN/KR/EN bookstore utility footer — brand | Đạo lộ | Tu luyện (Qidian/Kakao/WebNovel density). */
const FOOTER_GROUPS: FooterGroup[] = [
  {
    label: "Đạo lộ",
    links: [
      {
        href: "/",
        label: "Thư viện",
        match: (pathname) => pathname === "/" || pathname.startsWith("/categories"),
      },
      {
        href: "/discover",
        label: "Khám phá",
        match: (pathname) => pathname.startsWith("/discover"),
      },
      {
        href: "/updates",
        label: "Chương mới",
        match: (pathname) => pathname.startsWith("/updates"),
      },
      {
        href: "/dao-luan",
        label: "Luận đạo",
        match: (pathname) => pathname.startsWith("/dao-luan"),
      },
      {
        href: "/rankings?tab=betterbox",
        label: "Thiên bảng",
        match: (pathname) => pathname.startsWith("/rankings"),
      },
    ],
  },
  {
    label: "Tu luyện",
    links: [
      {
        href: "/account",
        label: "Động phủ",
        match: (pathname) => pathname.startsWith("/account"),
      },
      {
        href: "/reading-history",
        label: "Tàng thư",
        match: (pathname) => pathname.startsWith("/reading-history"),
      },
      {
        href: "/following",
        label: "Tủ truyện",
        match: (pathname) => pathname.startsWith("/following"),
      },
    ],
  },
];

function shouldHideFooter(pathname: string | null) {
  if (!pathname) return true;
  if (/\/stories\/[^/]+\/chapters\/[^/]+/.test(pathname)) return true;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return true;
  }
  return false;
}

function subscribeRouteLoading(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => undefined;
  const mo = new MutationObserver(onStoreChange);
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

function readRouteLoading() {
  return Boolean(document.querySelector(".xi-route-loading"));
}

/** True while a route `loading.tsx` shell is mounted (footer should stay hidden). */
function useRouteLoadingActive() {
  return useSyncExternalStore(subscribeRouteLoading, readRouteLoading, () => false);
}

export function SiteFooter() {
  const pathname = usePathname();
  const routeLoading = useRouteLoadingActive();
  // Defer until after hydrate so SSR/client first paint match (null) and we can
  // detect `.xi-route-loading` without flashing the footer over empty content.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || routeLoading || shouldHideFooter(pathname)) return null;

  return (
    <footer className="site-footer site-footer-dense site-footer-bookstore" aria-label="Chân trang Linh Quyển Các">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <p className="eyebrow site-footer-eyebrow">Thiên Thư</p>
          <p className="site-footer-title">{SITE_NAME}</p>
          <p className="site-footer-tagline">{SITE_TAGLINE}</p>
        </div>
        {FOOTER_GROUPS.map((group) => (
          <nav key={group.label} className="site-footer-group" aria-label={group.label}>
            <p className="site-footer-group-label">{group.label}</p>
            <ul className="site-footer-nav">
              {group.links.map((item) => {
                const active = item.match(pathname ?? "");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`site-footer-link${active ? " site-footer-link-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
