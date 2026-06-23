"use client";

import type HlsType from "hls.js";
import {
  MediaControlBar,
  MediaController,
  MediaDurationDisplay,
  MediaMuteButton,
  MediaPlayButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange
} from "media-chrome/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeFileModeProgress, computeSegmentModeProgress } from "@/lib/reader-audio-sync";
import {
  readReaderAudioAutoNext,
  writeReaderAudioAutoNext
} from "@/lib/reader-audio-auto-next";
import {
  readReaderAudioPlaybackRate,
  writeReaderAudioPlaybackRate,
  type ReaderAudioPlaybackRate
} from "@/lib/reader-audio-playback-rate";
import {
  clearReaderAudioSleepTimer,
  isReaderAudioSleepTimerPreset,
  readReaderAudioSleepTimerEndsAt,
  readReaderAudioSleepTimerPreset,
  scheduleReaderAudioSleepTimer,
  type ReaderAudioSleepTimerPreset
} from "@/lib/reader-audio-sleep-timer";

type ChapterAudioPlayerProps = {
  chapterId: string;
  audioUrl?: string | null;
  hlsUrl?: string | null;
  title: string;
  autoStartToken?: number;
  autoNextChapterUrl?: string | null;
  onAutoNextChapter?: () => void;
  onSleepTimerEnd?: () => void;
  readAlongEnabled?: boolean;
  onReadAlongEnabledChange?: (enabled: boolean) => void;
  onPlaybackProgress?: (snapshot: {
    progressRatio: number;
    segmentIndex: number | null;
    currentTime: number;
    duration: number;
  }) => void;
};

type SegmentStatusItem = {
  index: number;
  status: "pending" | "running" | "ready" | "failed";
  durationSeconds: number | null;
  url: string | null;
};

type SegmentStatusResponse = {
  segmentCount?: number;
  readyCount?: number;
  failedCount?: number;
  processing?: boolean;
  complete?: boolean;
  firstReadySegmentUrl?: string | null;
  segments?: SegmentStatusItem[];
  busy?: boolean;
  gate?: {
    reason?: string;
    message?: string | null;
    retryAfterSeconds?: number;
  };
  error?: string;
};

function isHlsSource(url: string) {
  return /\.m3u8(?:$|\?)/i.test(url);
}

export function ChapterAudioPlayer({
  chapterId,
  audioUrl,
  hlsUrl,
  title,
  autoStartToken = 0,
  autoNextChapterUrl = null,
  onAutoNextChapter,
  onSleepTimerEnd,
  readAlongEnabled: readAlongEnabledProp,
  onReadAlongEnabledChange,
  onPlaybackProgress
}: ChapterAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsInstanceRef = useRef<HlsType | null>(null);
  const autoStartSeenRef = useRef(0);
  const playRequestedRef = useRef(false);
  const timeoutIdsRef = useRef(new Set<number>());
  const generationRunRef = useRef(0);
  const [readyHlsUrl, setReadyHlsUrl] = useState<string | null>(null);
  const [segmentAudioUrl, setSegmentAudioUrl] = useState<string | null>(null);

  // Segment mode is handled imperatively — segmentAudioUrl is not in primaryUrl.
  // The main useEffect only manages audioUrl / HLS paths.
  const primaryUrl = readyHlsUrl ?? audioUrl ?? null;

  const fallbackUsedRef = useRef(false);
  const segmentAutoplayRef = useRef(false);
  const segmentWarmInFlightRef = useRef(false);
  // Holds pre-fetched blob URL for the next segment so onEnded can swap without a network round-trip.
  const preloadedNextRef = useRef<{ index: number; blobUrl: string } | null>(null);
  // Cross-segment seek: desired currentTime to apply once the target segment's canplay fires.
  const pendingSeekTimeRef = useRef<number | null>(null);
  const wasPlayingBeforeSeekRef = useRef(false);
  // Stable ref for seekBy so MediaSession handlers always call the latest version.
  const seekByRef = useRef<(delta: number) => void>(() => undefined);

  const clearManagedTimeout = useCallback((id: number) => {
    window.clearTimeout(id);
    timeoutIdsRef.current.delete(id);
  }, []);

  const clearManagedTimeouts = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutIdsRef.current.clear();
  }, []);

  const scheduleManagedTimeout = useCallback((callback: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timeoutIdsRef.current.delete(id);
      callback();
    }, delayMs);
    timeoutIdsRef.current.add(id);
    return id;
  }, []);

  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "fallback" | "warming" | "generating" | "busy" | "segment" | "error">(
    audioUrl ? "loading" : "idle"
  );
  const [segmentProgress, setSegmentProgress] = useState<{ ready: number; total: number } | null>(null);
  const [segmentStatus, setSegmentStatus] = useState<SegmentStatusResponse | null>(null);
  const [segmentNotice, setSegmentNotice] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState<ReaderAudioPlaybackRate>(1);
  const [autoNextEnabled, setAutoNextEnabled] = useState(false);
  const [sleepTimerPreset, setSleepTimerPreset] = useState<ReaderAudioSleepTimerPreset | 0>(0);
  const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);
  const [readAlongEnabledInternal, setReadAlongEnabledInternal] = useState(true);
  const lastProgressEmitRef = useRef(-1);
  const readAlongEnabled = readAlongEnabledProp ?? readAlongEnabledInternal;
  const setReadAlongEnabled = onReadAlongEnabledChange ?? setReadAlongEnabledInternal;
  const sourceKind = useMemo(() => (primaryUrl && isHlsSource(primaryUrl) ? "hls" : "file"), [primaryUrl]);
  const segmentQueueActive = !audioUrl && !readyHlsUrl;

  const emitPlaybackProgress = useCallback(() => {
    if (!readAlongEnabled || !onPlaybackProgress) return;
    const audio = audioRef.current;
    if (!audio) return;

    const progressRatio = segmentQueueActive
      ? computeSegmentModeProgress(segmentStatus?.segments ?? [], currentSegmentIndex, audio.currentTime)
      : computeFileModeProgress(audio.currentTime, audio.duration);

    const rounded = Math.round(progressRatio * 1000);
    if (rounded === lastProgressEmitRef.current) return;
    lastProgressEmitRef.current = rounded;

    onPlaybackProgress({
      progressRatio,
      segmentIndex: currentSegmentIndex,
      currentTime: audio.currentTime,
      duration: audio.duration
    });
  }, [currentSegmentIndex, onPlaybackProgress, readAlongEnabled, segmentQueueActive, segmentStatus?.segments]);

  // Revoke pre-fetched blob URL on unmount.
  useEffect(() => {
    return () => {
      generationRunRef.current += 1;
      clearManagedTimeouts();
      const p = preloadedNextRef.current;
      if (p) URL.revokeObjectURL(p.blobUrl);
    };
  }, [clearManagedTimeouts]);

  useEffect(() => {
    setPlaybackRate(readReaderAudioPlaybackRate());
    setAutoNextEnabled(readReaderAudioAutoNext());
  }, []);

  useEffect(() => {
    const endsAt = readReaderAudioSleepTimerEndsAt();
    if (endsAt) {
      setSleepTimerEndsAt(endsAt);
      setSleepTimerPreset(readReaderAudioSleepTimerPreset());
      return;
    }
    setSleepTimerPreset(readReaderAudioSleepTimerPreset());
  }, []);

  useEffect(() => {
    if (!sleepTimerEndsAt) return undefined;
    const remaining = sleepTimerEndsAt - Date.now();
    if (remaining <= 0) {
      setSleepTimerEndsAt(null);
      setSleepTimerPreset(0);
      clearReaderAudioSleepTimer();
      audioRef.current?.pause();
      onSleepTimerEnd?.();
      return undefined;
    }

    const id = window.setTimeout(() => {
      setSleepTimerEndsAt(null);
      setSleepTimerPreset(0);
      clearReaderAudioSleepTimer();
      audioRef.current?.pause();
      onSleepTimerEnd?.();
    }, remaining);

    return () => window.clearTimeout(id);
  }, [sleepTimerEndsAt, onSleepTimerEnd]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, album: "BetterBox Audio" });
  }, [title]);

  // MediaSession seek actions — set once, use seekByRef so the handler always has fresh state.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("seekbackward", (d) => seekByRef.current(-(d.seekOffset ?? 15)));
    navigator.mediaSession.setActionHandler("seekforward", (d) => seekByRef.current(d.seekOffset ?? 30));
    return () => {
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, []);

  const readySegmentAfter = useCallback((index: number) => {
    return segmentStatus?.segments?.find((segment) => segment.index > index && segment.url)?.index ?? null;
  }, [segmentStatus]);

  // Directly sets audio.src and starts loading — bypasses the React state → useEffect cycle
  // so there is no render-frame gap between segments.
  // Pass blobUrl to use a pre-fetched blob (no network fetch on swap).
  const playSegment = useCallback((index: number, url: string, autoplay = true, blobUrl?: string) => {
    const audio = audioRef.current;
    if (!audio) return false;
    setCurrentSegmentIndex(index);
    setSegmentAudioUrl(url); // server URL stored for display/tracking only
    setStatus("segment");
    audio.src = blobUrl ?? url;
    audio.playbackRate = playbackRate;
    audio.load();
    segmentAutoplayRef.current = autoplay;
    return true;
  }, [playbackRate]);

  const fetchSegmentStatus = useCallback(async (options: { waitMs?: number; afterReadyCount?: number } = {}) => {
    const params = new URLSearchParams();
    if (options.waitMs && options.waitMs > 0) params.set("waitMs", String(options.waitMs));
    if (typeof options.afterReadyCount === "number") params.set("afterReadyCount", String(options.afterReadyCount));
    const response = await fetch(`/api/chapters/${chapterId}/audio/segments${params.size ? `?${params.toString()}` : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Segment status failed");
    const data = (await response.json()) as SegmentStatusResponse;
    setSegmentStatus(data);
    setSegmentProgress({ ready: data.readyCount ?? 0, total: data.segmentCount ?? 0 });
    return data;
  }, [chapterId]);

  useEffect(() => {
    if (!hlsUrl) {
      setReadyHlsUrl(null);
      return;
    }

    let cancelled = false;
    const statusUrl = hlsUrl.replace(/\/master\.m3u8(?:$|\?)/, "");

    async function checkStatus() {
      if (document.visibilityState === "hidden") return false;
      try {
        const response = await fetch(statusUrl, { cache: "no-store" });
        if (!response.ok || cancelled) return false;
        const data = (await response.json()) as { ready?: boolean; playlistUrl?: string | null };
        if (data.ready && data.playlistUrl) {
          if (audioRef.current && !audioRef.current.paused) return true;
          setReadyHlsUrl(data.playlistUrl);
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }

    async function warm() {
      const ready = await checkStatus();
      if (ready || cancelled) return;
      setStatus((current) => (current === "fallback" ? "warming" : current));
      try {
        await fetch(statusUrl, { method: "POST", cache: "no-store" });
      } catch {
        return;
      }

      const poll = async (remaining: number) => {
        if (cancelled || remaining <= 0) return;
        const isReady = await checkStatus();
        if (isReady) return;
        if (!cancelled) scheduleManagedTimeout(() => void poll(remaining - 1), 2500);
      };
      scheduleManagedTimeout(() => void poll(8), 2500);
    }

    const timer = scheduleManagedTimeout(() => void warm(), 700);
    return () => {
      cancelled = true;
      clearManagedTimeout(timer);
    };
  }, [clearManagedTimeout, hlsUrl, scheduleManagedTimeout]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  // Handles audioUrl / HLS source changes only.
  // When primaryUrl is null and segmentAudioUrl is set, segment mode is active —
  // the audio element is managed imperatively by playSegment(), so we skip the reset.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!primaryUrl) {
      if (segmentAudioUrl) return;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setStatus("idle");
      return;
    }
    fallbackUsedRef.current = false;

    setStatus("loading");
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    const loadFallback = () => {
      if (!audioUrl) {
        setStatus("error");
        return;
      }
      fallbackUsedRef.current = true;
      audio.src = audioUrl;
      audio.load();
      setStatus("fallback");
    };

    if (!isHlsSource(primaryUrl)) {
      audio.src = primaryUrl;
      audio.playbackRate = playbackRate;
      audio.load();
      setStatus("fallback");
      return;
    }

    if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = primaryUrl;
      audio.playbackRate = playbackRate;
      audio.load();
      setStatus("streaming");
      return;
    }

    let cancelled = false;

    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !audioRef.current) return;

      if (!Hls.isSupported()) {
        loadFallback();
        return;
      }

      const hls = new Hls({ backBufferLength: 90, enableWorker: true, lowLatencyMode: false });
      hlsInstanceRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => { hls.loadSource(primaryUrl); });
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setStatus("streaming"); });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          hls.destroy();
          hlsInstanceRef.current = null;
          loadFallback();
        }
      });
      hls.attachMedia(audioRef.current);
    });

    return () => {
      cancelled = true;
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [audioUrl, playbackRate, primaryUrl, segmentAudioUrl]);

  const startSegmentGeneration = useCallback(async () => {
    const runId = generationRunRef.current + 1;
    generationRunRef.current = runId;
    setStatus("generating");
    setSegmentNotice(null);
    setSegmentProgress(null);
    setSegmentStatus(null);
    setCurrentSegmentIndex(null);
    setSegmentAudioUrl(null);
    segmentAutoplayRef.current = true;
    if (preloadedNextRef.current) {
      URL.revokeObjectURL(preloadedNextRef.current.blobUrl);
      preloadedNextRef.current = null;
    }
    try {
      const response = await fetch(`/api/chapters/${chapterId}/audio/segments`, { method: "POST", cache: "no-store" });
      const data = (await response.json().catch(() => null)) as SegmentStatusResponse | null;
      if (data) {
        setSegmentStatus(data);
        setSegmentProgress({ ready: data.readyCount ?? 0, total: data.segmentCount ?? 0 });
      }
      if (!response.ok) {
        if (response.status === 429 && data?.busy) {
          setStatus("busy");
          setSegmentNotice(data.gate?.message ?? "Máy đang bận, vui lòng đợi rồi thử lại.");
          return;
        }
        setStatus("error");
        setSegmentNotice(data?.error ?? "Không thể bắt đầu tạo audio.");
        return;
      }
    } catch {
      setStatus("error");
      setSegmentNotice("Không kết nối được server tạo audio.");
      return;
    }

    const poll = async (remaining: number) => {
      if (generationRunRef.current !== runId) return;
      if (remaining <= 0) return;
      if (document.visibilityState === "hidden") {
        // Tab hidden — fetch at a slow rate without consuming `remaining` attempts,
        // so we discover the first ready segment even with the screen off.
        try {
          const data = await fetchSegmentStatus({ waitMs: 0, afterReadyCount: 0 });
          if (generationRunRef.current !== runId) return;
          const firstReady = data.segments?.find((segment) => segment.url);
          if (firstReady?.url) {
            playSegment(firstReady.index, firstReady.url, true);
            return;
          }
        } catch {
          // ignore — reschedule below
        }
        scheduleManagedTimeout(() => void poll(remaining), 3000);
        return;
      }
      try {
        const data = await fetchSegmentStatus({ waitMs: 12000, afterReadyCount: 0 });
        if (generationRunRef.current !== runId) return;
        if (data.busy) {
          setStatus("busy");
          setSegmentNotice(data.gate?.message ?? "Máy đang bận, vui lòng đợi rồi thử lại.");
          return;
        }
        const firstReady = data.segments?.find((segment) => segment.url);
        if (firstReady?.url) {
          playSegment(firstReady.index, firstReady.url, true);
          return;
        }
      } catch {
        setStatus("generating");
      }
      if (generationRunRef.current === runId) scheduleManagedTimeout(() => void poll(remaining - 1), 350);
    };

    void poll(30);
  }, [chapterId, fetchSegmentStatus, playSegment, scheduleManagedTimeout]);

  useEffect(() => {
    if (!autoStartToken || autoStartSeenRef.current === autoStartToken) return;
    autoStartSeenRef.current = autoStartToken;
    playRequestedRef.current = true;

    if (!audioUrl && !segmentAudioUrl && status !== "generating") {
      void startSegmentGeneration();
      return;
    }

    audioRef.current?.play().catch(() => undefined);
  }, [audioUrl, autoStartToken, segmentAudioUrl, startSegmentGeneration, status]);

  // Background poll: waits for the next segment when current one is still generating.
  useEffect(() => {
    if (!segmentQueueActive || currentSegmentIndex === null) return;
    if (readySegmentAfter(currentSegmentIndex) !== null || segmentStatus?.complete) return;

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden" && !segmentAutoplayRef.current) {
        // Tab hidden and no active autoplay — defer at low rate instead of aborting.
        scheduleManagedTimeout(() => void poll(), 3000);
        return;
      }
      try {
        const data = await fetchSegmentStatus({ waitMs: 12000, afterReadyCount: segmentStatus?.readyCount ?? 0 });
        if (cancelled) return;
        const nextReady = data.segments?.find((segment) => segment.index > currentSegmentIndex && segment.url);
        if (nextReady?.url && segmentAutoplayRef.current) {
          playSegment(nextReady.index, nextReady.url, true);
          return;
        }
        if (!nextReady && data.processing) {
          scheduleManagedTimeout(() => void poll(), audioRef.current?.paused ? 700 : 250);
        }
      } catch {
        if (!cancelled) scheduleManagedTimeout(() => void poll(), 1200);
      }
    };

    const timer = scheduleManagedTimeout(() => void poll(), 900);
    return () => {
      cancelled = true;
      clearManagedTimeout(timer);
    };
  }, [chapterId, clearManagedTimeout, currentSegmentIndex, fetchSegmentStatus, playSegment, readySegmentAfter, scheduleManagedTimeout, segmentQueueActive, segmentStatus]);

  function playNextReadySegment() {
    if (currentSegmentIndex === null) return false;
    const nextSegment = segmentStatus?.segments?.find((s) => s.index > currentSegmentIndex && s.url);
    if (!nextSegment?.url) {
      if (segmentStatus?.processing) {
        setStatus("generating");
        segmentAutoplayRef.current = true;
        // Act on the fresh data immediately — stale segmentStatus may not have the segment yet.
        fetchSegmentStatus().then((data) => {
          const freshNext = data.segments?.find((s) => s.index > currentSegmentIndex && s.url);
          if (freshNext?.url && segmentAutoplayRef.current) {
            const preloaded = preloadedNextRef.current;
            const freshBlob = preloaded?.index === freshNext.index ? preloaded.blobUrl : undefined;
            playSegment(freshNext.index, freshNext.url, true, freshBlob);
          }
        }).catch(() => setStatus("error"));
      }
      return false;
    }
    // Use pre-fetched blob if available — eliminates network fetch latency on segment switch.
    const preloaded = preloadedNextRef.current;
    const blobUrl = preloaded?.index === nextSegment.index ? preloaded.blobUrl : undefined;
    return playSegment(nextSegment.index, nextSegment.url, true, blobUrl);
  }

  function seekBy(deltaSeconds: number) {
    const audio = audioRef.current;
    if (!audio) return;

    // Non-segment mode: clamp within current track.
    if (!segmentQueueActive || currentSegmentIndex === null) {
      audio.currentTime = Math.max(0, Math.min(
        Number.isFinite(audio.duration) ? audio.duration : audio.currentTime + deltaSeconds,
        audio.currentTime + deltaSeconds
      ));
      return;
    }

    const newTime = audio.currentTime + deltaSeconds;
    const duration = Number.isFinite(audio.duration) ? audio.duration : Infinity;

    if (newTime >= 0 && newTime <= duration) {
      audio.currentTime = newTime;
      return;
    }

    wasPlayingBeforeSeekRef.current = !audio.paused;
    const segments = segmentStatus?.segments ?? [];

    if (newTime < 0) {
      const overflow = -newTime;
      const prev = segments.filter((s) => s.index < currentSegmentIndex && s.url && s.durationSeconds != null).at(-1);
      if (prev?.url && prev.durationSeconds != null) {
        playSegment(prev.index, prev.url, false);
        pendingSeekTimeRef.current = Math.max(0, prev.durationSeconds - overflow);
      } else {
        audio.currentTime = 0;
      }
      return;
    }

    if (Number.isFinite(duration) && newTime > duration) {
      const overshoot = newTime - duration;
      const next = segments.find((s) => s.index > currentSegmentIndex && s.url);
      if (next?.url) {
        const preloaded = preloadedNextRef.current;
        const blobUrl = preloaded?.index === next.index ? preloaded.blobUrl : undefined;
        playSegment(next.index, next.url, false, blobUrl);
        pendingSeekTimeRef.current = Math.max(0, overshoot);
      }
    }
  }
  // Keep seekByRef in sync so MediaSession handlers always call the latest closure.
  seekByRef.current = seekBy;

  function warmNextSegment() {
    if (!segmentQueueActive || currentSegmentIndex === null) return;
    // Only skip warmup when hidden AND audio is not actively playing — never block during active playback.
    if (document.visibilityState === "hidden" && (audioRef.current?.paused ?? true)) return;
    const nextSegment = segmentStatus?.segments?.find((s) => s.index > currentSegmentIndex && s.url);

    if (nextSegment?.url) {
      // Next segment is ready — pre-fetch its audio into a blob URL so the switch is instant.
      // Do NOT skip when segmentStatus.complete: the final transition also needs a pre-fetch.
      if (preloadedNextRef.current?.index !== nextSegment.index) {
        fetch(nextSegment.url)
          .then((r) => r.blob())
          .then((blob) => {
            if (preloadedNextRef.current) URL.revokeObjectURL(preloadedNextRef.current.blobUrl);
            preloadedNextRef.current = { index: nextSegment.index, blobUrl: URL.createObjectURL(blob) };
          })
          .catch(() => undefined);
      }
      return;
    }

    // Only poll server if segments are still being generated.
    if (segmentStatus?.complete || segmentWarmInFlightRef.current) return;
    segmentWarmInFlightRef.current = true;
    void fetchSegmentStatus({ waitMs: 12000, afterReadyCount: segmentStatus?.readyCount ?? 0 })
      .catch(() => undefined)
      .finally(() => {
        segmentWarmInFlightRef.current = false;
      });
  }

  const statusLabel =
    status === "streaming"
      ? "HLS"
      : status === "warming"
        ? "Đang cache HLS"
        : status === "segment"
          ? "Segment"
          : status === "generating"
            ? "Đang tạo"
            : status === "fallback"
              ? "Audio file"
              : status === "error"
                ? "Lỗi"
                : status === "busy"
                  ? "Đang bận"
                  : status === "idle"
                    ? "Chưa có audio"
                    : "Đang tải";

  return (
    <div className="chapter-audio-player">
      <span className="chapter-audio-aura" aria-hidden="true" />
      <span className="chapter-audio-orbit chapter-audio-orbit-one" aria-hidden="true" />
      <span className="chapter-audio-orbit chapter-audio-orbit-two" aria-hidden="true" />
      <div className="chapter-audio-player-header">
        <div>
          <p className="eyebrow">Audio chương</p>
          <strong>{title}</strong>
        </div>
        <span className={`chapter-audio-badge chapter-audio-badge-${status}`}>{statusLabel}</span>
      </div>

      {!audioUrl && !segmentAudioUrl ? (
        <button className="chapter-audio-generate" type="button" onClick={startSegmentGeneration} disabled={status === "generating"}>
          {status === "generating" ? "Đang tạo đoạn đầu..." : status === "busy" ? "Thử lại tạo audio" : "Bắt đầu nghe audio"}
        </button>
      ) : null}

      {segmentNotice ? (
        <p className={`chapter-audio-notice chapter-audio-notice-${status === "busy" ? "busy" : "error"}`} role={status === "busy" ? "status" : "alert"} aria-live="polite">
          {segmentNotice}
        </p>
      ) : null}

      {segmentProgress ? (
        <p className="chapter-audio-segment-status">
          Đã sẵn sàng {segmentProgress.ready}/{segmentProgress.total || "?"} đoạn
          {currentSegmentIndex !== null ? ` · đang nghe đoạn ${currentSegmentIndex + 1}` : ""}
          {segmentStatus?.processing ? " · đang tạo tiếp" : ""}
        </p>
      ) : null}

      <div className="chapter-audio-quick-controls" aria-label="Audio quick controls">
        <button type="button" onClick={() => seekBy(-15)} disabled={!primaryUrl && !segmentAudioUrl}>
          -15s
        </button>
        <button type="button" onClick={() => seekBy(30)} disabled={!primaryUrl && !segmentAudioUrl}>
          +30s
        </button>
        <label>
          <span>Tốc độ</span>
          <select
            value={playbackRate}
            onChange={(event) => {
              const next = Number(event.target.value);
              setPlaybackRate(next);
              writeReaderAudioPlaybackRate(next);
            }}
          >
            <option value="0.85">0.85x</option>
            <option value="1">1x</option>
            <option value="1.15">1.15x</option>
            <option value="1.3">1.3x</option>
          </select>
        </label>
        <label>
          <span>Hẹn giờ</span>
          <select
            value={sleepTimerPreset}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!isReaderAudioSleepTimerPreset(next)) {
                setSleepTimerPreset(0);
                setSleepTimerEndsAt(null);
                clearReaderAudioSleepTimer();
                return;
              }
              setSleepTimerPreset(next);
              setSleepTimerEndsAt(scheduleReaderAudioSleepTimer(next));
            }}
          >
            <option value="0">Tắt</option>
            <option value="15">15 phút</option>
            <option value="30">30 phút</option>
            <option value="45">45 phút</option>
            <option value="60">60 phút</option>
          </select>
        </label>
        {autoNextChapterUrl ? (
          <label className="chapter-audio-auto-next">
            <input
              type="checkbox"
              checked={autoNextEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                setAutoNextEnabled(enabled);
                writeReaderAudioAutoNext(enabled);
              }}
            />
            <span>Chương sau</span>
          </label>
        ) : null}
        <label className="chapter-audio-auto-next">
          <input
            type="checkbox"
            checked={readAlongEnabled}
            onChange={(event) => setReadAlongEnabled(event.target.checked)}
          />
          <span>Đọc theo audio</span>
        </label>
      </div>

      <MediaController audio className="chapter-audio-controller">
        <audio
          ref={audioRef}
          slot="media"
          preload={sourceKind === "hls" ? "none" : "metadata"}
          aria-label={`Audio ${title}`}
          onCanPlay={() => {
            setStatus((current) => (current === "streaming" ? current : sourceKind === "hls" ? "streaming" : segmentAudioUrl && !audioUrl ? "segment" : "fallback"));
            if (playRequestedRef.current && audioUrl) {
              playRequestedRef.current = false;
              audioRef.current?.play().catch(() => undefined);
            }
            if (segmentAutoplayRef.current && segmentAudioUrl && !audioUrl) {
              segmentAutoplayRef.current = false;
              audioRef.current?.play().catch(() => undefined);
            }
            // Apply cross-segment seek target, preserving prior play/pause state.
            if (pendingSeekTimeRef.current !== null && audioRef.current) {
              audioRef.current.currentTime = pendingSeekTimeRef.current;
              pendingSeekTimeRef.current = null;
              if (wasPlayingBeforeSeekRef.current) audioRef.current.play().catch(() => undefined);
            }
            // Kick off pre-fetch for the next segment as soon as this one starts — don't wait for T-8s.
            if (segmentQueueActive) warmNextSegment();
          }}
          onPlay={() => {
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          }}
          onPause={() => {
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
          }}
          onEnded={() => {
            if (segmentQueueActive) {
              const played = playNextReadySegment();
              if (!played && autoNextEnabled && onAutoNextChapter && segmentStatus?.complete) {
                onAutoNextChapter();
              }
              return;
            }
            if (autoNextEnabled && autoNextChapterUrl && onAutoNextChapter) {
              onAutoNextChapter();
            }
          }}
          onTimeUpdate={() => {
            const audio = audioRef.current;
            if (!audio || !Number.isFinite(audio.duration)) return;
            if (audio.duration - audio.currentTime <= 8) warmNextSegment();
            emitPlaybackProgress();
          }}
          onError={() => {
            const audio = audioRef.current;
            if (audio && audioUrl && !fallbackUsedRef.current && primaryUrl !== audioUrl) {
              fallbackUsedRef.current = true;
              audio.src = audioUrl;
              audio.load();
              setStatus("fallback");
              return;
            }
            setStatus("error");
          }}
        />
        <MediaControlBar className="chapter-audio-controls">
          <MediaPlayButton />
          <MediaTimeDisplay />
          <MediaTimeRange />
          <MediaDurationDisplay />
          <MediaMuteButton />
          <MediaVolumeRange />
        </MediaControlBar>
      </MediaController>

      {status === "error" ? (
        <p className="chapter-audio-error">Không phát được audio này. Có thể manifest/segment chưa sẵn sàng hoặc trình duyệt không hỗ trợ nguồn hiện tại.</p>
      ) : null}
    </div>
  );
}
