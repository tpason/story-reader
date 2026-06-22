import type { ReaderRealtimeEventType } from "@/lib/reader-realtime";

export type ReaderRealtimeEvent = {
  type: ReaderRealtimeEventType | "unknown";
  storyId?: string;
  chapterNumber?: number;
  message?: string;
};

export function parseReaderRealtimeEvent(raw: unknown): ReaderRealtimeEvent {
  const message = (raw ?? {}) as Record<string, unknown>;
  const type = typeof message.type === "string" ? message.type : "unknown";
  return {
    type: type as ReaderRealtimeEvent["type"],
    storyId: typeof message.storyId === "string" ? message.storyId : undefined,
    chapterNumber: typeof message.chapterNumber === "number" ? message.chapterNumber : undefined,
    message: typeof message.message === "string" ? message.message : undefined
  };
}
