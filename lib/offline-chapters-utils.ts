export const OFFLINE_DOWNLOAD_MAX = 20;
export const OFFLINE_DOWNLOAD_PRESETS = [5, 10, 20] as const;

export type OfflineCacheRecordLike = {
  storyId: string;
  storyTitle: string;
  chapterNumber: number;
  payload: unknown;
};

export type OfflineCacheStorySummaryLike = {
  storyId: string;
  storyTitle: string;
  chapterCount: number;
  estimatedBytes: number;
  minChapter: number;
  maxChapter: number;
};

export function summarizeOfflineCacheByStory(records: OfflineCacheRecordLike[]): OfflineCacheStorySummaryLike[] {
  const grouped = new Map<string, OfflineCacheRecordLike[]>();

  for (const record of records) {
    const current = grouped.get(record.storyId) ?? [];
    current.push(record);
    grouped.set(record.storyId, current);
  }

  return Array.from(grouped.entries())
    .map(([storyId, storyRecords]) => {
      const sorted = [...storyRecords].sort((left, right) => left.chapterNumber - right.chapterNumber);
      return {
        storyId,
        storyTitle: sorted[0]?.storyTitle ?? storyId,
        chapterCount: sorted.length,
        estimatedBytes: estimateOfflineCacheBytes(sorted),
        minChapter: sorted[0]?.chapterNumber ?? 0,
        maxChapter: sorted[sorted.length - 1]?.chapterNumber ?? 0
      };
    })
    .sort((left, right) => right.chapterCount - left.chapterCount);
}

export function estimateOfflineCacheBytes(records: Array<{ payload: unknown }>) {
  return records.reduce((total, record) => {
    try {
      return total + JSON.stringify(record.payload).length;
    } catch {
      return total;
    }
  }, 0);
}

export function formatOfflineCacheSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
