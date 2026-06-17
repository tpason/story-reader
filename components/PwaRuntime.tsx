"use client";

import { Bell, BellOff, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-until";
const PUSH_KEY = "pwa-push-subscribed";
const DISMISS_DAYS = 30;

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-key");
    const data = (await res.json()) as { key: string | null };
    return data.key;
  } catch {
    return null;
  }
}

async function subscribePush(swReg: ServiceWorkerRegistration): Promise<boolean> {
  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return false;

  // Record the existing endpoint before subscribing so we can detect whether
  // subscribe() returned an existing subscription or created a new one.
  const existingEndpoint = (await swReg.pushManager.getSubscription())?.endpoint ?? null;

  const sub = await swReg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const json = sub.toJSON() as {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  });

  if (!res.ok) {
    // Only unsubscribe if this is a newly created subscription — if subscribe()
    // returned the existing one (same endpoint), a transient server failure should
    // not destroy a working subscription that the server may still hold.
    if (sub.endpoint !== existingEndpoint) {
      await sub.unsubscribe().catch(() => undefined);
    }
    return false;
  }

  return true;
}

async function unsubscribePush(swReg: ServiceWorkerRegistration): Promise<void> {
  const sub = await swReg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PwaRuntime() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const [visible, setVisible] = useState(false);
  const [pushVisible, setPushVisible] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

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
        swRegRef.current = registration;
        registration.update().catch(() => undefined);

        // Check if already subscribed
        registration.pushManager.getSubscription().then((sub) => {
          const wasSubscribed = window.localStorage.getItem(PUSH_KEY) === "1";
          setPushSubscribed(!!sub && wasSubscribed);
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
  }, []);

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
    if (window.localStorage.getItem(PUSH_KEY)) return;

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
      if (!window.localStorage.getItem(PUSH_KEY)) setPushVisible(true);
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
          window.localStorage.setItem(PUSH_KEY, "1");
          setPushSubscribed(true);
        }
      } else {
        const ok = await subscribePush(swReg);
        if (ok) {
          window.localStorage.setItem(PUSH_KEY, "1");
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
      window.localStorage.removeItem(PUSH_KEY);
      setPushSubscribed(false);
    } catch {
      // ignore
    } finally {
      setPushLoading(false);
    }
  }

  function dismissPush() {
    setPushVisible(false);
    window.localStorage.setItem(PUSH_KEY, "dismissed");
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
              Bật thông báo khi có <strong>chương mới</strong>
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
