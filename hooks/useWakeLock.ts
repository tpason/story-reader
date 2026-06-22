import { useCallback, useEffect, useRef, useState } from "react";

type WakeLockSentinelLike = EventTarget & {
  released: boolean;
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

const UNSUPPORTED_MESSAGE = "Trình duyệt này chưa hỗ trợ giữ sáng màn hình.";
const REQUEST_FAILED_MESSAGE = "Không bật được giữ sáng. Hãy thử lại sau một thao tác chạm.";

export type UseWakeLockResult = {
  supported: boolean;
  active: boolean;
  error: string | null;
  request: () => Promise<void>;
  release: () => void;
  /** Release if currently held/requested, otherwise request. */
  toggle: () => void;
};

/**
 * Screen Wake Lock for the reader ("giữ màn hình sáng").
 *
 * Re-acquires the lock when the tab becomes visible again (the browser drops
 * wake locks on tab hide), and releases on unmount. `requestedRef` tracks the
 * user's intent so visibility-driven re-acquire only happens when they asked
 * for it.
 */
export function useWakeLock(): UseWakeLockResult {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lockRef = useRef<WakeLockSentinelLike | null>(null);
  const requestedRef = useRef(false);

  const release = useCallback(() => {
    requestedRef.current = false;
    const lock = lockRef.current;
    lockRef.current = null;
    setActive(false);
    if (lock && !lock.released) {
      lock.release().catch(() => undefined);
    }
  }, []);

  const request = useCallback(async () => {
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
    if (!wakeLock) {
      setError(UNSUPPORTED_MESSAGE);
      setSupported(false);
      return;
    }

    try {
      setError(null);
      requestedRef.current = true;
      const lock = await wakeLock.request("screen");
      lockRef.current = lock;
      setActive(true);
      lock.addEventListener("release", () => {
        if (lockRef.current === lock) {
          lockRef.current = null;
          setActive(false);
        }
      });
    } catch {
      requestedRef.current = false;
      setError(REQUEST_FAILED_MESSAGE);
      setActive(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (lockRef.current || requestedRef.current) {
      release();
    } else {
      void request();
    }
  }, [release, request]);

  useEffect(() => {
    setSupported(Boolean((navigator as NavigatorWithWakeLock).wakeLock));

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && requestedRef.current && !lockRef.current) {
        void request();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      release();
    };
  }, [release, request]);

  return { supported, active, error, request, release, toggle };
}
