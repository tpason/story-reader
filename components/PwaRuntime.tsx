"use client";

import { Bell, BellOff, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  PUSH_SUBSCRIBED_KEY,
  readPushSubscribed,
  subscribePush,
  unsubscribePush
} from "@/lib/push-client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-until";
const DISMISS_DAYS = 30;

export function PwaRuntime() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const [visible, setVisible] = useState(false);
  const [pushVisible, setPushVisible] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const enablePwa =
    process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_PWA === "1";

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!enablePwa) return;

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
        swRegRef.current = registration;
        registration.update().catch(() => undefined);

        // Check if already subscribed
        registration.pushManager.getSubscription().then((sub) => {
          readPushSubscribed(registration).then(setPushSubscribed).catch(() => {
            setPushSubscribed(!!sub && window.localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "1");
          });
        }).catch(() => undefined);
      })
      .catch(() => undefined);

    const onChunkError = (event: ErrorEvent) => {
      const message = `${event.message ?? ""} ${event.error?.message ?? ""}`;
      if (!/ChunkLoadError|Loading chunk|failed to fetch dynamically imported module/i.test(message)) return;
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .finally(() => window.location.reload());
    };

    window.addEventListener("error", onChunkError);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("error", onChunkError);
    };
  }, [enablePwa]);

  // Install banner
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

  // Push banner — show after a delay if not subscribed and push is supported
  useEffect(() => {
    if (!("PushManager" in window)) return;
    if (window.localStorage.getItem(PUSH_SUBSCRIBED_KEY)) return;

    const timer = setTimeout(() => {
      if (!visible) setPushVisible(true);
    }, 20000);

    return () => clearTimeout(timer);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    const until = Date.now() + DISMISS_DAYS * 86_400_000;
    window.localStorage.setItem(DISMISS_KEY, String(until));
    // Show push banner shortly after
    setTimeout(() => {
      if (!window.localStorage.getItem(PUSH_SUBSCRIBED_KEY)) setPushVisible(true);
    }, 3000);
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

  async function enablePush() {
    setPushLoading(true);
    try {
      // Guard: verify auth before prompting for OS-level permission — /api/auth/me
      // always returns 200, so check the body for a non-null user.
      const authRes = await fetch("/api/auth/me").catch(() => null);
      const authData = authRes ? ((await authRes.json().catch(() => null)) as { user: unknown } | null) : null;
      if (!authData?.user) {
        setPushVisible(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushVisible(false);
        return;
      }
      const swReg = swRegRef.current;
      if (!swReg) {
        // Fallback: get registration from browser
        const reg = await navigator.serviceWorker.ready;
        swRegRef.current = reg;
        const ok = await subscribePush(reg);
        if (ok) {
          window.localStorage.setItem(PUSH_SUBSCRIBED_KEY, "1");
          setPushSubscribed(true);
        }
      } else {
        const ok = await subscribePush(swReg);
        if (ok) {
          window.localStorage.setItem(PUSH_SUBSCRIBED_KEY, "1");
          setPushSubscribed(true);
        }
      }
      setPushVisible(false);
    } catch {
      setPushVisible(false);
    } finally {
      setPushLoading(false);
    }
  }

  async function disablePush() {
    setPushLoading(true);
    try {
      const swReg = swRegRef.current ?? (await navigator.serviceWorker.ready);
      await unsubscribePush(swReg);
      window.localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
      setPushSubscribed(false);
    } catch {
      // ignore
    } finally {
      setPushLoading(false);
    }
  }

  function dismissPush() {
    setPushVisible(false);
    window.localStorage.setItem(PUSH_SUBSCRIBED_KEY, "dismissed");
  }

  return (
    <>
      {visible && (
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
      )}

      {pushVisible && !visible && (
        <div className="pwa-install-banner pwa-push-banner" role="region" aria-label="Thông báo chương mới">
          <div className="pwa-install-content">
            <Bell size={16} className="pwa-install-icon" />
            <span className="pwa-install-text">
              Bật thông báo khi truyện <strong>đang đọc</strong> có chương mới
            </span>
          </div>
          <div className="pwa-install-actions">
            <button
              className="pwa-install-btn"
              type="button"
              onClick={enablePush}
              disabled={pushLoading}
            >
              {pushLoading ? "Đang bật…" : "Bật thông báo"}
            </button>
            <button className="pwa-install-dismiss" type="button" aria-label="Đóng" onClick={dismissPush}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Persistent toggle in account page context — exposed via data attr */}
      <span
        className="pwa-push-state"
        data-subscribed={pushSubscribed ? "1" : "0"}
        aria-hidden="true"
        style={{ display: "none" }}
      />

      {pushSubscribed && (
        <button
          className="pwa-push-active-btn"
          type="button"
          onClick={disablePush}
          disabled={pushLoading}
          title="Tắt thông báo chương mới"
          aria-label="Tắt thông báo chương mới"
        >
          <BellOff size={14} />
          {pushLoading ? "Đang tắt…" : "Đang nhận thông báo"}
        </button>
      )}
    </>
  );
}
