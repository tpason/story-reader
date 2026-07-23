"use client";

import { useEffect, useState } from "react";
import { READER_ENGAGE_MIN_CHAPTER } from "@/lib/reader-engagement";

// Calm reading: wait longer / deeper before surfacing follow/push chrome.
const ENGAGE_DWELL_MS = 150_000;
const ENGAGE_SCROLL_PERCENT = 55;

export function useReaderEngageGate(chapterNumber: number) {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [dwellReady, setDwellReady] = useState(false);

  useEffect(() => {
    setDwellReady(false);
    const timer = window.setTimeout(() => setDwellReady(true), ENGAGE_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [chapterNumber]);

  useEffect(() => {
    function updateScroll() {
      const root = document.documentElement;
      const max = root.scrollHeight - root.clientHeight;
      const next = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
      setScrollPercent(next);
    }
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [chapterNumber]);

  const engageReady =
    chapterNumber >= READER_ENGAGE_MIN_CHAPTER &&
    (scrollPercent >= ENGAGE_SCROLL_PERCENT || dwellReady);

  return { engageReady, scrollPercent };
}
