/** Lightweight chapter reader shell while client bundle hydrates. */
export function ReaderChapterShellSkeleton() {
  return (
    <main className="reader-shell reader-shell--compact reader-shell-skeleton" data-theme="sepia" aria-busy="true" aria-label="Đang mở chương">
      <div className="reader-chapter-skeleton-topbar" />
      <div className="reader-chapter-skeleton-body">
        <div className="reader-chapter-skeleton-heading" />
        <div className="reader-chapter-skeleton-content">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="reader-chapter-skeleton-line" style={{ width: `${68 + (i % 4) * 8}%` }} />
          ))}
        </div>
      </div>
    </main>
  );
}
