/** Lightweight chapter reader shell while navigating / hydrating client bundle. */
export function ReaderChapterShellSkeleton() {
  return (
    <main
      className="reader-shell reader-shell-skeleton"
      data-theme="parchment"
      aria-busy="true"
      aria-label="Đang mở chương"
    >
      <div className="reader-chapter-skeleton-topbar" aria-hidden="true">
        <span className="reader-chapter-skeleton-dot" />
        <span className="reader-chapter-skeleton-stack">
          <span className="reader-chapter-skeleton-bar reader-chapter-skeleton-bar--lg" />
          <span className="reader-chapter-skeleton-bar reader-chapter-skeleton-bar--sm" />
        </span>
        <span className="reader-chapter-skeleton-actions">
          <span className="reader-chapter-skeleton-dot" />
          <span className="reader-chapter-skeleton-dot" />
          <span className="reader-chapter-skeleton-dot" />
        </span>
      </div>

      <div className="reader-chapter-skeleton-body" aria-hidden="true">
        <div className="reader-chapter-skeleton-heading">
          <span className="reader-chapter-skeleton-bar reader-chapter-skeleton-bar--sm" />
          <span className="reader-chapter-skeleton-bar reader-chapter-skeleton-bar--title" />
        </div>
        <div className="reader-chapter-skeleton-content">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="reader-chapter-skeleton-para">
              <span
                className="reader-chapter-skeleton-line"
                style={{ width: `${88 - (i % 3) * 8}%` }}
              />
              <span
                className="reader-chapter-skeleton-line"
                style={{ width: `${92 - (i % 4) * 6}%` }}
              />
              <span
                className="reader-chapter-skeleton-line"
                style={{ width: `${70 - (i % 5) * 4}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
