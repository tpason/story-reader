"use client";

import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-until";
const DISMISS_DAYS = 30;

export function PwaRuntime() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        registration.update().catch(() => undefined);
      })
      .catch(() => undefined);

    const onChunkError = (event: ErrorEvent) => {
      const message = `${event.message ?? ""} ${event.error?.message ?? ""}`;
      if (!/ChunkLoadError|Loading chunk|failed to fetch dynamically imported module/i.test(message)) return;
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .finally(() => window.location.reload());
    };

    window.addEventListener("error", onChunkError);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("error", onChunkError);
    };
  }, []);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() < Number(dismissed)) return;

    let showTimer: ReturnType<typeof setTimeout>;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferredRef.current = event as BeforeInstallPromptEvent;
      showTimer = setTimeout(() => setVisible(true), 9000);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(showTimer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    const until = Date.now() + DISMISS_DAYS * 86_400_000;
    window.localStorage.setItem(DISMISS_KEY, String(until));
  }

  async function install() {
    const deferred = deferredRef.current;
    if (!deferred) return;
    setVisible(false);
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "dismissed") {
      const until = Date.now() + DISMISS_DAYS * 86_400_000;
      window.localStorage.setItem(DISMISS_KEY, String(until));
    }
    deferredRef.current = null;
  }

  if (!visible) return null;

  return (
    <div className="pwa-install-banner" role="region" aria-label="Cài đặt ứng dụng">
      <div className="pwa-install-content">
        <Download size={16} className="pwa-install-icon" />
        <span className="pwa-install-text">
          Thêm <strong>Linh Quyển Các</strong> vào màn hình chính
        </span>
      </div>
      <div className="pwa-install-actions">
        <button className="pwa-install-btn" type="button" onClick={install}>
          Thêm ngay
        </button>
        <button className="pwa-install-dismiss" type="button" aria-label="Đóng" onClick={dismiss}>
          ×
        </button>
      </div>
    </div>
  );
}
