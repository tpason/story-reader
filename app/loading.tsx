import { DiscoveryRailSkeleton } from "@/components/DiscoveryRailSkeleton";

/**
 * Root route loading — full page skeleton so the layout footer stays below the fold
 * (layout always mounts SiteFooter beside {children}).
 * Compact markup: desktop search skel + extra cards hide via CSS ≤839px.
 */
export default function Loading() {
  return (
    <div className="xi-route-loading" role="status" aria-busy="true" aria-label="Đang tải">
      <div className="xi-route-progress" aria-hidden="true">
        <span className="xi-route-progress-bar" />
      </div>
      <main className="app-shell xi-route-loading-shell">
        <header className="topbar topbar-skel xi-route-loading-topbar" aria-hidden="true">
          <div className="brand">
            <div className="xi-skel xi-route-loading-mark" />
            <div className="xi-skel xi-route-loading-brand" />
          </div>
          <div style={{ flex: 1 }} />
          <div className="xi-skel xi-route-loading-search" />
          <div className="xi-skel xi-route-loading-chip" />
        </header>
        <div className="page-wrap">
          <div className="xi-route-loading-hero xi-skel" aria-hidden="true" />
          <div className="xi-route-loading-discovery">
            <DiscoveryRailSkeleton />
          </div>
          <div className="story-grid story-grid-skeleton xi-route-loading-grid" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`story-card story-card-skeleton${i >= 4 ? " xi-route-loading-card-extra" : ""}`}
              >
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
