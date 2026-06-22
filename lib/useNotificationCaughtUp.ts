"use client";

import { useEffect, useState } from "react";
import { NOTIFY_CAUGHT_UP_EVENT, readNotificationCaughtUp, type NotificationCaughtUpMap } from "@/lib/notification-caught-up";

export function useNotificationCaughtUp() {
  const [map, setMap] = useState<NotificationCaughtUpMap>(() =>
    typeof window !== "undefined" ? readNotificationCaughtUp() : {}
  );

  useEffect(() => {
    function sync() {
      setMap(readNotificationCaughtUp());
    }
    window.addEventListener(NOTIFY_CAUGHT_UP_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NOTIFY_CAUGHT_UP_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return map;
}
