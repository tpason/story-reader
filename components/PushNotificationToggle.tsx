"use client";

import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  PUSH_SUBSCRIBED_KEY,
  readPushSubscribed,
  subscribePush,
  unsubscribePush
} from "@/lib/push-client";

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidReady, setVapidReady] = useState(false);

  const refreshState = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const keyRes = await fetch("/api/push/vapid-key").catch(() => null);
    const keyData = keyRes ? ((await keyRes.json().catch(() => null)) as { key?: string | null } | null) : null;
    setVapidReady(!!keyData?.key);
    try {
      const reg = await navigator.serviceWorker.ready;
      setSubscribed(await readPushSubscribed(reg));
    } catch {
      setSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  if (!supported || !vapidReady) return null;

  async function enable() {
    setLoading(true);
    try {
      const authRes = await fetch("/api/auth/me").catch(() => null);
      const authData = authRes ? ((await authRes.json().catch(() => null)) as { user: unknown } | null) : null;
      if (!authData?.user) return;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.ready;
      const ok = await subscribePush(reg);
      if (ok) {
        window.localStorage.setItem(PUSH_SUBSCRIBED_KEY, "1");
        setSubscribed(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      await unsubscribePush(reg);
      window.localStorage.removeItem(PUSH_SUBSCRIBED_KEY);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="push-settings-card" role="region" aria-label="Thông báo chương mới">
      <div className="push-settings-copy">
        <p className="eyebrow">Linh tin</p>
        <h2>Thông báo khi tab đóng</h2>
        <p>Nhận thông báo hệ thống khi truyện đạo hữu <strong>theo dõi</strong> có chương mới — kể cả khi không mở Linh Quyển Các.</p>
      </div>
      <button
        type="button"
        className={`chip push-settings-btn ${subscribed ? "chip-active" : ""}`.trim()}
        onClick={subscribed ? disable : enable}
        disabled={loading}
      >
        {loading ? <LoaderCircle size={14} className="spin" /> : subscribed ? <BellOff size={14} /> : <Bell size={14} />}
        {loading ? "Đang xử lý…" : subscribed ? "Đang bật — nhấn để tắt" : "Bật thông báo chương mới"}
      </button>
    </div>
  );
}
