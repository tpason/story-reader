"use client";

import { useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "account-identity", label: "Định danh" },
  { id: "account-linh-tin", label: "Linh tin" },
  { id: "account-performance", label: "Hiệu năng" },
  { id: "account-offline", label: "Ngoại tuyến" },
  { id: "account-shelf", label: "Kệ sách" },
  { id: "account-stats", label: "Thống kê" },
  { id: "account-cultivation", label: "Tu vi" },
] as const;

export function AccountSectionNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const navRef = useRef<HTMLElement>(null);
  const scrollLockRef = useRef(false);

  useEffect(() => {
    const targets = SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollLockRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.55] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeLink = nav.querySelector<HTMLAnchorElement>(`a[href="#${active}"]`);
    activeLink?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  function handleNavClick(id: string) {
    setActive(id);
    scrollLockRef.current = true;
    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 700);
  }

  return (
    <div className="account-section-nav-shell">
      <nav ref={navRef} className="account-section-nav" aria-label="Mục động phủ">
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            className={`account-section-nav-link${active === id ? " account-section-nav-link-active" : ""}`}
            aria-current={active === id ? "true" : undefined}
            onClick={() => handleNavClick(id)}
          >
            {label}
          </a>
        ))}
      </nav>
    </div>
  );
}
