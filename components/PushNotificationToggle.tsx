"use client";

import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { diagnosePush, type PushDiagnostic } from "@/lib/push-diagnostic";
import {
  enablePushNotifications,
  isPushApiSupported,
  PUSH_SUBSCRIBED_KEY,
  readPushSubscribed,
  unsubscribePush
} from "@/lib/push-client";
import { NOTIFY_COPY } from "@/lib/xianxia-notify-copy";

export function PushNotificationToggle() {
  const [diagnostic, setDiagnostic] = useState<PushDiagnostic | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const refreshState = useCallback(async () => {
    setChecking(true);
    const diag = await diagnosePush();
    setDiagnostic(diag);
    if (isPushApiSupported()) {
      try {
        const reg = await navigator.serviceWorker.ready;
        setSubscribed(await readPushSubscribed(reg));
      } catch {
        setSubscribed(false);
      }
    } else {
      setSubscribed(false);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  async function enable() {
    setLoading(true);
    try {
      const ok = await enablePushNotifications();
      if (ok) {
        setSubscribed(true);
        await refreshState();
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
      await refreshState();
    } finally {
      setLoading(false);
    }
  }

  if (checking && !diagnostic) {
    return (
      <div className="push-settings-card push-settings-card-loading" role="status">
        <LoaderCircle size={16} className="spin" />
        <span>Đang kiểm tra linh tin…</span>
      </div>
    );
  }

  // Server / PWA not ready — hide the whole card. Ops hints (VAPID, .env) never belong on Động phủ.
  if (diagnostic && !diagnostic.featureAvailable && !subscribed) {
    return null;
  }

  if (!isPushApiSupported() && !subscribed) {
    return null;
  }

  // Only blockers the reader can act on (login, browser permission). Never ops/config.
  const visibleBlockers = diagnostic?.blockers.filter((blocker) => blocker.audience === "user") ?? [];
  const canShowToggle = Boolean(diagnostic?.canEnable || subscribed);
  const showDiagnostics = visibleBlockers.length > 0 && !subscribed;

  return (
    <div className="push-settings-card" role="region" aria-label={NOTIFY_COPY.pushTitle}>
      <div className="push-settings-copy">
        <h2>
          <Bell size={18} aria-hidden="true" />
          <span>{NOTIFY_COPY.pushTitle}</span>
        </h2>
        <p>
          Nhận linh tin khi truyện đạo hữu <strong>đang tu hoặc theo dõi</strong> có chương mới, kể cả khi không mở Linh
          Quyển Các. Chỉ gửi khi đạo hữu chưa đọc tới chương đó.
        </p>
        {showDiagnostics ? (
          <ul className="push-diagnostic-list">
            {visibleBlockers.map((blocker) => (
              <li key={blocker.code}>
                <strong>{blocker.message}</strong>
                {blocker.hint ? <span>{blocker.hint}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {canShowToggle ? (
        <button
          type="button"
          className={`chip push-settings-btn ${subscribed ? "chip-active" : ""}`.trim()}
          onClick={subscribed ? disable : enable}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle size={16} className="spin" aria-hidden="true" />
          ) : subscribed ? (
            <BellOff size={16} aria-hidden="true" />
          ) : (
            <Bell size={16} aria-hidden="true" />
          )}
          <span>{loading ? "Đang xử lý…" : subscribed ? "Đang bật. Nhấn để tắt" : NOTIFY_COPY.pushCta}</span>
        </button>
      ) : showDiagnostics ? (
        <p className="push-diagnostic-foot">Hoàn tất các mục trên rồi tải lại trang để bật linh tin.</p>
      ) : null}
    </div>
  );
}
