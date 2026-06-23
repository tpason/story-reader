"use client";

import { Database, Trash2, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  clearAllOfflineCache,
  clearStoryOfflineCache,
  listOfflineCacheByStory,
  type OfflineCacheStorySummary
} from "@/lib/offline-chapters";
import { formatOfflineCacheSize } from "@/lib/offline-chapters-utils";
import { storyHref } from "@/lib/urls";

export function AccountOfflineCachePanel() {
  const [summaries, setSummaries] = useState<OfflineCacheStorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearingStoryId, setClearingStoryId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await listOfflineCacheByStory();
    setSummaries(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleClearStory(storyId: string) {
    setClearingStoryId(storyId);
    try {
      await clearStoryOfflineCache(storyId);
      await refresh();
    } finally {
      setClearingStoryId(null);
    }
  }

  async function handleClearAll() {
    setClearingAll(true);
    try {
      await clearAllOfflineCache();
      await refresh();
    } finally {
      setClearingAll(false);
    }
  }

  const totalBytes = summaries.reduce((sum, item) => sum + item.estimatedBytes, 0);
  const totalChapters = summaries.reduce((sum, item) => sum + item.chapterCount, 0);

  return (
    <section className="account-offline-cache-block" aria-label="Cache offline">
      <div className="account-offline-cache-heading">
        <p className="eyebrow">Linh quyển offline</p>
        <h2>Chương đã tải về</h2>
        <p>Danh sách truyện đang lưu trong trình duyệt để đọc khi mất mạng.</p>
      </div>

      <div className="account-offline-cache-summary">
        <WifiOff size={16} aria-hidden="true" />
        <span>
          {loading
            ? "Đang quét cache…"
            : summaries.length === 0
              ? "Chưa có chương offline."
              : `${summaries.length} truyện · ${totalChapters} chương · ${formatOfflineCacheSize(totalBytes)}`}
        </span>
      </div>

      {summaries.length > 0 ? (
        <ul className="account-offline-cache-list">
          {summaries.map((item) => (
            <li key={item.storyId} className="account-offline-cache-item">
              <div className="account-offline-cache-item-copy">
                <strong>{item.storyTitle}</strong>
                <small>
                  Chương {item.minChapter}
                  {item.maxChapter > item.minChapter ? `–${item.maxChapter}` : ""} · {item.chapterCount} chương ·{" "}
                  {formatOfflineCacheSize(item.estimatedBytes)}
                </small>
              </div>
              <div className="account-offline-cache-item-actions">
                <Link className="chip" href={storyHref({ id: item.storyId, title: item.storyTitle }, item.minChapter)}>
                  <Database size={13} />
                  Mở
                </Link>
                <button
                  type="button"
                  className="chip"
                  disabled={clearingStoryId === item.storyId || clearingAll}
                  onClick={() => void handleClearStory(item.storyId)}
                >
                  <Trash2 size={13} />
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {summaries.length > 0 ? (
        <button
          type="button"
          className="account-offline-cache-clear-all"
          disabled={clearingAll || clearingStoryId != null}
          onClick={() => void handleClearAll()}
        >
          Xóa toàn bộ cache offline
        </button>
      ) : null}
    </section>
  );
}
