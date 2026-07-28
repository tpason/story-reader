"use client";

import { useEffect, useState } from "react";

type ActiveAnnouncement = {
  id: string;
  message: string;
  updatedAt: string;
};

const ANNOUNCE_ATTR = "data-xi-announce";
const ANNOUNCE_HEIGHT_VAR = "--site-announcement-height";

export function SiteAnnouncementMarquee() {
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/announcements/active", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { announcement: ActiveAnnouncement | null };
        if (!cancelled) setAnnouncement(payload.announcement);
      } catch {
        if (!cancelled) setAnnouncement(null);
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!announcement?.message) {
      root.removeAttribute(ANNOUNCE_ATTR);
      root.style.removeProperty(ANNOUNCE_HEIGHT_VAR);
      return;
    }
    root.setAttribute(ANNOUNCE_ATTR, "1");
    // Approximate single-line banner height; refined after paint.
    root.style.setProperty(ANNOUNCE_HEIGHT_VAR, "2.15rem");
    return () => {
      root.removeAttribute(ANNOUNCE_ATTR);
      root.style.removeProperty(ANNOUNCE_HEIGHT_VAR);
    };
  }, [announcement]);

  if (!announcement?.message) return null;

  return (
    <div className="site-announcement" role="status" aria-live="polite">
      <div className="site-announcement-track">
        <span className="site-announcement-text">{announcement.message}</span>
        <span className="site-announcement-text" aria-hidden>
          {announcement.message}
        </span>
      </div>
    </div>
  );
}
