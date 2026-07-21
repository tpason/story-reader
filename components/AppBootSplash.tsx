"use client";

import { useEffect, useState } from "react";
import { ReaderLogo } from "@/components/ReaderLogo";

const SESSION_KEY = "lq-boot-splash-seen";

/** One short branded splash per tab session — before route loading UI. */
export function AppBootSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }

    setVisible(true);

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
  }, []);

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
