"use client";

import { Bell, BellOff, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  PUSH_SUBSCRIBED_KEY,
  readPushSubscribed,
  subscribePush,
  unsubscribePush
} from "@/lib/push-client";
import { NOTIFY_COPY } from "@/lib/xianxia-notify-copy";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const INSTALL_DISMISS_KEY = "pwa-install-dismissed-until";
const PUSH_BANNER_DISMISS_KEY = "pwa-push-banner-dismissed-until";
const INSTALL_DISMISS_DAYS = 30;
const PUSH_BANNER_DISMISS_DAYS = 14;
const INSTALL_BANNER_DELAY_MS = 9_000;
const PUSH_BANNER_DELAY_MS = 22_000;
const PUSH_AFTER_INSTALL_MS = 4_000;

function isDismissedUntil(key: string) {
  const until = window.localStorage.getItem(key);
  return Boolean(until && Date.now() < Number(until));
}

function schedulePushBanner(onFire: () => void, delayMs: number) {
  return window.setTimeout(() => {
    if (isDismissedUntil(PUSH_BANNER_DISMISS_KEY)) return;
    if (window.localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "1") return;
    onFire();
  }, delayMs);
}

export function PwaRuntime() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const pushTimerRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [pushVisible, setPushVisible] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const enablePwa =
    process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_PWA === "1";

  function clearPushTimer() {
    if (pushTimerRef.current) {
      window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
  }

  function queuePushBanner(delayMs = PUSH_BANNER_DELAY_MS) {
    clearPushTimer();
    pushTimerRef.current = schedulePushBanner(() => setPushVisible(true), delayMs);
  }

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

        registration.pushManager
          .getSubscription()
          .then((sub) => {
            readPushSubscribed(registration)
              .then(setPushSubscribed)
              .catch(() => {
                setPushSubscribed(!!sub && window.localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "1");
              });
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);

    const onChunkError = (event: ErrorEvent) => {
      const message = `${event.message ?? ""} ${event.error?.message ?? ""}`;
      if (!/ChunkLoadError|Loading chunk|failed to fetch dynamically imported module/i.test(message)) return;
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .finally(() => window.location.reload());
    };

    window.addEventListener("error", onChunkError);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("error", onChunkError);
    };
  }, [enablePwa]);

  useEffect(() => {
    if (isDismissedUntil(INSTALL_DISMISS_KEY)) return;

    let showTimer: ReturnType<typeof setTimeout>;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferredRef.current = event as BeforeInstallPromptEvent;
      showTimer = setTimeout(() => setVisible(true), INSTALL_BANNER_DELAY_MS);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(showTimer);
    };
  }, []);

  useEffect(() => {
    if (!("PushManager" in window)) return;
    if (window.localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "1") return;
    if (isDismissedUntil(PUSH_BANNER_DISMISS_KEY)) return;

    queuePushBanner();
    return () => clearPushTimer();
  }, []);

  useEffect(() => {
    if (visible) setPushVisible(false);
  }, [visible]);

  function dismissInstall() {
    setVisible(false);
    const until = Date.now() + INSTALL_DISMISS_DAYS * 86_400_000;
    window.localStorage.setItem(INSTALL_DISMISS_KEY, String(until));
    queuePushBanner(PUSH_AFTER_INSTALL_MS);
  }

  async function install() {
    const deferred = deferredRef.current;
    if (!deferred) return;
    setVisible(false);
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "dismissed") {
      const until = Date.now() + INSTALL_DISMISS_DAYS * 86_400_000;
      window.localStorage.setItem(INSTALL_DISMISS_KEY, String(until));
    }
    deferredRef.current = null;
    queuePushBanner(PUSH_AFTER_INSTALL_MS);
  }

  async function enablePush() {
    setPushLoading(true);
    try {
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
      const swReg = swRegRef.current ?? (await navigator.serviceWorker.ready);
      swRegRef.current = swReg;
      const ok = await subscribePush(swReg);
      if (ok) {
        window.localStorage.setItem(PUSH_SUBSCRIBED_KEY, "1");
        setPushSubscribed(true);
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
    const until = Date.now() + PUSH_BANNER_DISMISS_DAYS * 86_400_000;
    window.localStorage.setItem(PUSH_BANNER_DISMISS_KEY, String(until));
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
            <button className="pwa-install-dismiss" type="button" aria-label="Đóng" onClick={dismissInstall}>
              ×
            </button>
          </div>
        </div>
      )}

      {pushVisible && !visible && (
        <div className="pwa-install-banner pwa-push-banner" role="region" aria-label={NOTIFY_COPY.pushTitle}>
          <div className="pwa-install-content">
            <Bell size={16} className="pwa-install-icon" />
            <span className="pwa-install-text">{NOTIFY_COPY.pushBody}</span>
          </div>
          <div className="pwa-install-actions">
            <button className="pwa-install-btn" type="button" onClick={enablePush} disabled={pushLoading}>
              {pushLoading ? "Đang bật…" : NOTIFY_COPY.pushCta}
            </button>
            <button className="pwa-install-dismiss" type="button" aria-label="Đóng" onClick={dismissPush}>
              ×
            </button>
          </div>
        </div>
      )}

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
          title="Tắt linh tin ngoài tab"
          aria-label="Tắt linh tin ngoài tab"
        >
          <BellOff size={14} />
          {pushLoading ? "Đang tắt…" : "Đang nhận linh tin"}
        </button>
      )}
    </>
  );
}
