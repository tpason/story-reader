"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const TRACK_ZEN = "/background-audio/mystical-zen-serenity-cinematic-ambient-meditation-music-332902.mp3";
const TRACK_FLUTE = "/background-audio/samurai-flutes-ethereal-fantasy-flute-relaxing-meditation-music-248255.mp3";
const TRACKS = [TRACK_ZEN, TRACK_FLUTE];

const FADE_DURATION = 2000;
const TARGET_VOLUME = 0.22;

export function AmbientSoundPlayer() {
  const [enabled, setEnabled] = useState(false);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const fadeTimers = useRef<ReturnType<typeof setInterval>[]>([]);
  const initialized = useRef(false);

  const clearFadeTimers = () => {
    fadeTimers.current.forEach(clearInterval);
    fadeTimers.current = [];
  };

  const fadeTo = useCallback((target: number) => {
    clearFadeTimers();
    const audios = audioRefs.current;
    audios.forEach((audio) => {
      const start = audio.volume;
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / FADE_DURATION);
        audio.volume = start + (target - start) * t;
        if (t >= 1) clearInterval(timer);
      }, 50);
      fadeTimers.current.push(timer);
    });
  }, []);

  const toggle = useCallback(() => {
    if (!initialized.current) {
      audioRefs.current = TRACKS.map((src) => {
        const a = new Audio(src);
        a.loop = true;
        a.volume = 0;
        return a;
      });
      initialized.current = true;
    }

    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem("ambient-sound-enabled", String(next)); } catch {}
      if (next) {
        audioRefs.current.forEach((a) => a.play().catch(() => {}));
        fadeTo(TARGET_VOLUME);
      } else {
        fadeTo(0);
        setTimeout(() => {
          audioRefs.current.forEach((a) => a.pause());
        }, FADE_DURATION + 100);
      }
      return next;
    });
  }, [fadeTo]);

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem("ambient-sound-enabled") === "true") {
        // Don't auto-play — require user interaction first
      }
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      clearFadeTimers();
      audioRefs.current.forEach((a) => { a.pause(); a.src = ""; });
    };
  }, []);

  return (
    <button
      className={`ambient-sound-btn${enabled ? " ambient-sound-btn--active" : ""}`}
      onClick={toggle}
      title={enabled ? "Tắt linh âm" : "Bật linh âm hoàn cảnh"}
      aria-label={enabled ? "Tắt linh âm" : "Bật linh âm hoàn cảnh"}
      type="button"
    >
      {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}
