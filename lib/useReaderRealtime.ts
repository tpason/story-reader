"use client";

import { useEffect, useRef, useState } from "react";
import { getReaderWebSocketUrl, isReaderRealtimeEventType } from "@/lib/reader-realtime";
import { parseReaderRealtimeEvent, type ReaderRealtimeEvent } from "@/lib/reader-realtime-event";
import { dispatchReaderRealtimeEvent } from "@/lib/reader-realtime-bus";

type UseReaderRealtimeOptions = {
  userId: string | null;
  storyIds: string[];
  onEvent: (event: ReaderRealtimeEvent) => void;
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
  const storyIdsRef = useRef(storyIds);
  storyIdsRef.current = storyIds;
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
          storyIds: storyIdsRef.current
        })
      );
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      setLive(false);
      clearReconnectTimer();
      const jitter = Math.floor(Math.random() * retryMs * 0.25);
      reconnectTimer = setTimeout(() => {
        retryMs = Math.min(retryMs * 2, MAX_RECONNECT_MS);
        connect();
      }, retryMs + jitter);
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
          const parsed = parseReaderRealtimeEvent(JSON.parse(String(event.data)));
          if (isReaderRealtimeEventType(parsed.type)) {
            onEventRef.current(parsed);
            dispatchReaderRealtimeEvent(parsed);
            return;
          }
          if (parsed.type !== "connected" && parsed.type !== "subscribed") {
            onEventRef.current(parsed);
            dispatchReaderRealtimeEvent(parsed);
          }
        } catch {
          onEventRef.current({ type: "unknown" });
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
