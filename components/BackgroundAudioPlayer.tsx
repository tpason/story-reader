"use client";

import { Music2, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { animate } from "animejs";
import { BACKGROUND_AUDIO_TRACKS } from "@/lib/background-audio";
import { prefersReducedMotion } from "@/lib/browser";

const STORAGE_KEY = "reader-background-audio";

type StoredAudioState = {
  trackId?: string;
  volume?: number;
};

type AudioGraph = {
  context: AudioContext;
  gain: GainNode;
};

type WindowWithAudioContext = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function clampVolume(value: unknown, fallback = 0.28) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

function readStoredAudioState(): StoredAudioState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as StoredAudioState;
  } catch {
    return {};
  }
}

type BackgroundAudioPlayerProps = {
  /** fab = fixed corner control; inline = sheet/overflow embed (no dock collision). */
  mode?: "fab" | "inline";
};

export function BackgroundAudioPlayer({ mode = "fab" }: BackgroundAudioPlayerProps) {
  const stored = useMemo(readStoredAudioState, []);
  const [trackId, setTrackId] = useState(stored.trackId ?? BACKGROUND_AUDIO_TRACKS[0]?.id ?? "");
  const [volume, setVolume] = useState(clampVolume(stored.volume));
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const volumeRef = useRef(volume);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const audioSourceElementRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const activeTrack = BACKGROUND_AUDIO_TRACKS.find((track) => track.id === trackId) ?? BACKGROUND_AUDIO_TRACKS[0];

  function syncAudioVolume(nextVolume = volumeRef.current) {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = nextVolume;
      audio.muted = nextVolume <= 0;
    }
    if (audioGraphRef.current) {
      audioGraphRef.current.gain.gain.value = nextVolume;
    }
  }

  function ensureAudioGraph() {
    const audio = audioRef.current;
    if (!audio) return null;
    if (audioGraphRef.current && audioSourceElementRef.current === audio) {
      return audioGraphRef.current;
    }

    try {
      const AudioContextConstructor = window.AudioContext || (window as WindowWithAudioContext).webkitAudioContext;
      if (!AudioContextConstructor) return null;
      const context = new AudioContextConstructor();
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      gain.gain.value = volumeRef.current;
      source.connect(gain);
      gain.connect(context.destination);
      audioGraphRef.current = { context, gain };
      audioSourceElementRef.current = audio;
      return audioGraphRef.current;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ trackId, volume }));
  }, [trackId, volume]);

  useEffect(() => {
    volumeRef.current = volume;
    syncAudioVolume(volume);
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    const wasPlaying = isPlayingRef.current;
    audio.src = activeTrack.src;
    syncAudioVolume(volumeRef.current);
    audio.load();
    if (wasPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setError("Trình duyệt cần thao tác chạm để bật nhạc nền.");
      });
    }
  }, [activeTrack]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !isOpen || prefersReducedMotion()) return;
    const animation = animate(panel, {
      opacity: [0, 1],
      translateY: [10, 0],
      scale: [0.98, 1],
      duration: 320,
      ease: "outExpo"
    });
    return () => {
      animation.revert();
    };
  }, [isOpen]);

  useEffect(() => {
    const openPlayer = () => setIsOpen(true);
    window.addEventListener("reader-background-audio-open", openPlayer);
    return () => window.removeEventListener("reader-background-audio-open", openPlayer);
  }, []);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    try {
      const graph = ensureAudioGraph();
      if (graph?.context.state === "suspended") {
        await graph.context.resume();
      }
      syncAudioVolume(volume);
      await audio.play();
      setIsPlaying(true);
      isPlayingRef.current = true;
    } catch {
      setError("Không bật được nhạc nền. Hãy chạm lại sau khi trang đã sẵn sàng.");
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }

  function muteToggle() {
    setVolume((current) => (current > 0 ? 0 : 0.28));
  }

  if (!activeTrack) return null;

  const isInline = mode === "inline";

  return (
    <div className={`background-audio ${isInline ? "background-audio-inline" : ""} ${isOpen ? "background-audio-open" : ""}`}>
      <audio
        ref={audioRef}
        loop
        preload="none"
        onCanPlay={() => {
          syncAudioVolume(volumeRef.current);
        }}
        onEnded={() => {
          setIsPlaying(false);
          isPlayingRef.current = false;
        }}
        onPause={() => {
          setIsPlaying(false);
          isPlayingRef.current = false;
        }}
        onPlay={() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
        }}
      />
      <button
        className={isInline ? "reader-sheet-action background-audio-trigger-inline" : "background-audio-trigger"}
        type="button"
        aria-label="Nhạc nền đọc truyện"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Music2 size={isInline ? 16 : 17} />
        {isInline ? (isPlaying ? "Đang phát nhạc nền" : "Nhạc nền") : null}
        {!isInline && isPlaying ? <span className="background-audio-pulse" /> : null}
      </button>

      {isOpen ? (
        <div className="background-audio-panel" ref={panelRef}>
          <div className="background-audio-header">
            <div>
              <p className="eyebrow">Nhạc nền</p>
              <strong>{activeTrack.label}</strong>
              <span>{activeTrack.mood}</span>
            </div>
            <button className="icon-button" type="button" aria-label="Đóng nhạc nền" onClick={() => setIsOpen(false)}>
              <X size={15} />
            </button>
          </div>

          <div className="background-audio-controls">
            <button className="background-audio-play" type="button" onClick={togglePlay}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? "Tạm dừng" : "Bật nền"}
            </button>
            <button className="icon-button" type="button" title={volume > 0 ? "Tắt âm" : "Bật âm"} onClick={muteToggle}>
              {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          </div>

          <label className="background-audio-volume">
            <span>Âm lượng {Math.round(volume * 100)}%</span>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(clampVolume(event.target.value, volume))} />
          </label>

          <div className="background-audio-track-grid">
            {BACKGROUND_AUDIO_TRACKS.map((track) => (
              <button className={track.id === activeTrack.id ? "active" : ""} type="button" key={track.id} onClick={() => setTrackId(track.id)}>
                <strong>{track.label}</strong>
                <span>{track.mood}</span>
              </button>
            ))}
          </div>

          {error ? <p className="background-audio-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
