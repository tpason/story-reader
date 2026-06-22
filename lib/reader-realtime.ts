export const READER_REALTIME_EVENT_TYPES = [
  "story_update",
  "chapter_update",
  "notification_update"
] as const;

export type ReaderRealtimeEventType = (typeof READER_REALTIME_EVENT_TYPES)[number];

export function getReaderWebSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_READER_WS_URL) return process.env.NEXT_PUBLIC_READER_WS_URL;
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/reader-ws`;
}

export function isReaderRealtimeEventType(value: string): value is ReaderRealtimeEventType {
  return (READER_REALTIME_EVENT_TYPES as readonly string[]).includes(value);
}
