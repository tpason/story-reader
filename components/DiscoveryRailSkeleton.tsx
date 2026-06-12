export function DiscoveryRailSkeleton() {
  return (
    <div className="discovery-section" aria-hidden="true">
      <div className="discovery-section-title xi-skel xi-skel-title" />
      <div className="discovery-grid">
        {[0, 1].map((panel) => (
          <div key={panel} className="discovery-panel">
            <div className="section-heading-row discovery-heading">
              <div style={{ flex: 1 }}>
                <div className="xi-skel xi-skel-eyebrow" />
                <div className="xi-skel xi-skel-heading" />
                <div className="xi-skel xi-skel-body" />
              </div>
            </div>
            <div className="discovery-row">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="discovery-card xi-skel-card">
                  <div className="xi-skel xi-skel-cover" />
                  <div className="discovery-card-body">
                    <div className="xi-skel xi-skel-line xi-skel-line-short" />
                    <div className="xi-skel xi-skel-line" />
                    <div className="xi-skel xi-skel-line xi-skel-line-mid" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
