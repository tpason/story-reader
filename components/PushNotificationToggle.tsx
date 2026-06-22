"use client";

import { Bell, BellOff, Feather, LoaderCircle, Sparkles } from "lucide-react";
import { NOTIFY_COPY } from "@/lib/xianxia-notify-copy";
import { useCallback, useEffect, useState } from "react";
import {
  enablePushNotifications,
  isPushApiSupported,
  isVapidConfigured,
  PUSH_SUBSCRIBED_KEY,
  readPushSubscribed,
  unsubscribePush
} from "@/lib/push-client";

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vapidReady, setVapidReady] = useState(false);

  const refreshState = useCallback(async () => {
    if (!isPushApiSupported()) {
      setSupported(false);
      return;
    }
    setSupported(true);
    setVapidReady(await isVapidConfigured());
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
      const ok = await enablePushNotifications();
      if (ok) setSubscribed(true);
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
    <div className="push-settings-card" role="region" aria-label={NOTIFY_COPY.eyebrow}>
      <div className="push-settings-copy">
        <p className="eyebrow">
          <Sparkles size={12} aria-hidden="true" />
          {NOTIFY_COPY.eyebrow}
        </p>
        <h2>
          <Feather size={18} aria-hidden="true" />
          {NOTIFY_COPY.pushTitle}
        </h2>
        <p>
          Nhận linh tin khi truyện đạo hữu <strong>đang tu hoặc theo dõi</strong> có chương mới — kể cả khi không mở Linh
          Quyển Các. Chỉ gửi khi đạo hữu chưa đọc tới chương đó.
        </p>
      </div>
      <button
        type="button"
        className={`chip push-settings-btn ${subscribed ? "chip-active" : ""}`.trim()}
        onClick={subscribed ? disable : enable}
        disabled={loading}
      >
        {loading ? <LoaderCircle size={14} className="spin" /> : subscribed ? <BellOff size={14} /> : <Bell size={14} />}
        {loading ? "Đang xử lý…" : subscribed ? "Đang bật — nhấn để tắt" : NOTIFY_COPY.pushCta}
      </button>
    </div>
  );
}
