import { DiscoveryRailSkeleton } from "@/components/DiscoveryRailSkeleton";

/**
 * Root route loading — full page skeleton so the layout footer stays below the fold
 * (layout always mounts SiteFooter beside {children}).
 */
export default function Loading() {
  return (
    <div className="xi-route-loading" role="status" aria-busy="true" aria-label="Đang tải">
      <div className="xi-route-progress" aria-hidden="true">
        <span className="xi-route-progress-bar" />
      </div>
      <main className="app-shell xi-route-loading-shell">
        <header className="topbar topbar-skel" aria-hidden="true">
          <div className="brand">
            <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
            <div className="xi-skel" style={{ width: 110, height: 16 }} />
          </div>
          <div style={{ flex: 1 }} />
          <div className="xi-skel" style={{ width: 160, height: 32, borderRadius: 20 }} />
          <div className="xi-skel" style={{ width: 80, height: 28, borderRadius: 20 }} />
        </header>
        <div className="page-wrap">
          <div className="xi-route-loading-hero xi-skel" aria-hidden="true" />
          <DiscoveryRailSkeleton />
          <div className="story-grid story-grid-skeleton" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
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
    </div>
  );
}
