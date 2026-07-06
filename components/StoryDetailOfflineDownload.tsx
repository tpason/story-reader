"use client";

import { LoaderCircle, WifiOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchReaderChapter } from "@/lib/reader-query";
import { downloadChaptersFrom, listCachedStoryChapters } from "@/lib/offline-chapters";
import {
  formatOfflineCacheSize,
  OFFLINE_DOWNLOAD_PRESETS,
  estimateOfflineCacheBytes
} from "@/lib/offline-chapters-utils";
import type { StorySummary } from "@/lib/types";

type StoryDetailOfflineDownloadProps = {
  story: StorySummary;
  startChapter: number;
};

export function StoryDetailOfflineDownload({ story, startChapter }: StoryDetailOfflineDownloadProps) {
  const [cachedCount, setCachedCount] = useState(0);
  const [cacheBytes, setCacheBytes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshCache = useCallback(async () => {
    const records = await listCachedStoryChapters(story.id);
    setCachedCount(records.length);
    setCacheBytes(estimateOfflineCacheBytes(records));
  }, [story.id]);

  useEffect(() => {
    void refreshCache();
  }, [refreshCache]);

  async function downloadPreset(count: number) {
    setError(null);
    setLoading(true);
    setProgress({ done: 0, total: count });
    try {
      const payload = await fetchReaderChapter(story.id, startChapter);
      await downloadChaptersFrom(payload, startChapter, count, {
        includeCurrent: true,
        onProgress: (done, total) => setProgress({ done, total })
      });
      await refreshCache();
    } catch {
      setError("Không tải được offline. Kiểm tra mạng rồi thử lại.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <section className="story-offline-download" aria-label="Tải offline">
      <div className="story-offline-download-head">
        <WifiOff size={16} aria-hidden />
        <div>
          <strong>Tải offline</strong>
          <p>Lưu chương vào Thiên Thư cục bộ để đọc khi mất mạng.</p>
        </div>
      </div>
      {cachedCount > 0 ? (
        <p className="story-offline-download-status">
          Đã tải <strong>{cachedCount}</strong> chương
          {cacheBytes > 0 ? ` · ~${formatOfflineCacheSize(cacheBytes)}` : ""}
        </p>
      ) : null}
      {loading && progress ? (
        <div className="story-offline-download-progress" role="status" aria-live="polite">
          <div
            className="story-offline-download-progress-bar"
            style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
          />
          <span>
            Đang tải {progress.done}/{progress.total}…
          </span>
        </div>
      ) : null}
      <div className="story-offline-download-actions" role="group" aria-label="Tải theo số chương">
        {OFFLINE_DOWNLOAD_PRESETS.map((count) => (
          <button
            key={count}
            type="button"
            className="chip"
            disabled={loading}
            onClick={() => void downloadPreset(count)}
          >
            {loading ? <LoaderCircle size={14} className="spin" aria-hidden /> : null}
            Tải {count} chương
          </button>
        ))}
      </div>
      {error ? <p className="story-offline-download-error">{error}</p> : null}
    </section>
  );
}
