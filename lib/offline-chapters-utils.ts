export const OFFLINE_DOWNLOAD_MAX = 20;
export const OFFLINE_DOWNLOAD_PRESETS = [5, 10, 20] as const;

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
