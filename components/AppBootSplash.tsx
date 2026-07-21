"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ReaderLogo } from "@/components/ReaderLogo";

const SESSION_KEY = "lq-boot-splash-seen";

function readShouldShowBootSplash(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !sessionStorage.getItem(SESSION_KEY);
  } catch {
    return false;
  }
}

/** One short branded splash per tab session — before route loading UI. */
export function AppBootSplash() {
  // Sync sessionStorage in initializer (client remounts) + layoutEffect (SSR hydrate)
  // so splash can cover content before paint — not useState(false) then effect show.
  const [visible, setVisible] = useState(readShouldShowBootSplash);

  useLayoutEffect(() => {
    if (visible) return;
    if (!readShouldShowBootSplash()) return;
    setVisible(true);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const dismiss = () => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setVisible(false);
    };

    const maxWait = window.setTimeout(dismiss, 900);
    const onReady = () => {
      window.clearTimeout(maxWait);
      window.setTimeout(dismiss, 280);
    };

    if (document.readyState === "complete") onReady();
    else window.addEventListener("load", onReady, { once: true });

    return () => window.clearTimeout(maxWait);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="xi-boot-splash" aria-hidden="true">
      <div className="xi-boot-splash-aura" />
      <ReaderLogo className="xi-boot-splash-mark" />
      <p className="xi-boot-splash-title">Linh Quyển Các</p>
      <p className="xi-boot-splash-tagline">Tu tiên từng chương</p>
    </div>
  );
}
