"use client";

import { useEffect, useRef, useState } from "react";
import { getReaderWebSocketUrl, isReaderRealtimeEventType } from "@/lib/reader-realtime";

type UseReaderRealtimeOptions = {
  userId: string | null;
  storyIds: string[];
  onEvent: (messageType: string) => void;
  enabled?: boolean;
};

const MIN_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 60000;

export function useReaderRealtime({
  userId,
  storyIds,
  onEvent,
  enabled = true
}: UseReaderRealtimeOptions): boolean {
  const [live, setLive] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const storyIdsKey = storyIds.join(",");

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("WebSocket" in window)) {
      setLive(false);
      return;
    }

    const wsUrl = getReaderWebSocketUrl();
    if (!wsUrl) {
      setLive(false);
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let retryMs = MIN_RECONNECT_MS;
    let disposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const closeSocket = () => {
      if (!socket) return;
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      socket.close();
      socket = null;
    };

    const subscribe = () => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      socket.send(
        JSON.stringify({
          type: "subscribe",
          scope: "reader_updates",
          userId,
          storyIds
        })
      );
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      setLive(false);
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => {
        retryMs = Math.min(retryMs * 2, MAX_RECONNECT_MS);
        connect();
      }, retryMs);
    };

    const connect = () => {
      if (disposed) return;
      clearReconnectTimer();
      closeSocket();
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        retryMs = MIN_RECONNECT_MS;
        setLive(true);
        subscribe();
      };
      socket.onclose = () => scheduleReconnect();
      socket.onerror = () => setLive(false);
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as { type?: string };
          const type = message.type || "";
          if (isReaderRealtimeEventType(type)) onEventRef.current(type);
        } catch {
          onEventRef.current("unknown");
        }
      };
    };

    connect();

    const onVisibilityChange = () => {
      if (document.hidden || disposed) return;
      if (socket?.readyState === WebSocket.OPEN) {
        subscribe();
        return;
      }
      retryMs = MIN_RECONNECT_MS;
      connect();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearReconnectTimer();
      closeSocket();
      setLive(false);
    };
  }, [enabled, storyIdsKey, userId]);

  return live;
}
