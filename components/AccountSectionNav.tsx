"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const targets = SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-18% 0px -58% 0px", threshold: [0, 0.2, 0.45] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="account-section-nav" aria-label="Mục động phủ">
      {SECTIONS.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={`account-section-nav-link${active === id ? " account-section-nav-link-active" : ""}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
