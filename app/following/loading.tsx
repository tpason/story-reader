/** Compact following loading — full viewport so layout footer stays off-screen on mobile. */
export default function FollowingLoading() {
  return (
    <main className="app-shell xi-route-loading" aria-busy="true" aria-label="Đang tải">
      <header className="topbar topbar-skel" aria-hidden="true">
        <div className="brand">
          <div className="xi-skel xi-route-loading-mark" />
          <div className="xi-skel xi-route-loading-brand" />
        </div>
        <div style={{ flex: 1 }} />
        <div className="xi-skel xi-route-loading-chip" />
      </header>
      <div className="page-wrap">
        <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10, width: 72 }} />
        <div className="xi-skel" style={{ height: 26, width: "48%", marginBottom: 18, maxWidth: 200 }} />
        <div className="story-grid story-grid-skeleton xi-route-loading-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="story-card story-card-skeleton">
              <div className="story-card-skeleton-cover" />
              <div className="story-card-body">
                <div className="story-card-skeleton-line story-card-skeleton-line-short" />
                <div className="story-card-skeleton-line" />
                <div className="story-card-skeleton-line story-card-skeleton-line-mid" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
