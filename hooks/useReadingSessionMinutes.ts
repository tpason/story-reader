import { useEffect, useState } from "react";

/**
 * Minutes elapsed in the current reading session, resetting to 0 whenever the
 * chapter changes. Ticks every 30s; consumed read-only by the stats pill.
 *
 * This is the isolated, side-effect-free slice of reader progress tracking —
 * deliberately separate from the scroll/persist/resume core, which shares many
 * mutable refs and is not safely extractable without e2e verification.
 */
export function useReadingSessionMinutes(chapterId: string): number {
  const [sessionMinutes, setSessionMinutes] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    setSessionMinutes(0);
    const timer = window.setInterval(() => {
      setSessionMinutes(Math.max(0, Math.floor((Date.now() - startedAt) / 60000)));
    }, 30000);
    return () => window.clearInterval(timer);
  }, [chapterId]);

  return sessionMinutes;
}
