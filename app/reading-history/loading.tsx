export default function ReadingHistoryLoading() {
  return (
    <main className="app-shell xi-route-loading" aria-busy="true" aria-label="Đang tải">
      <header className="topbar topbar-skel" aria-hidden="true">
        <div className="brand">
          <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          <div className="xi-skel" style={{ width: 140, height: 16 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="xi-skel" style={{ width: 80, height: 28, borderRadius: 20 }} />
      </header>

      <div className="page-wrap history-wrap">
        <section className="library-header" aria-hidden="true">
          <div>
            <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
            <div className="xi-skel" style={{ height: 28, width: "55%", marginBottom: 10 }} />
            <div className="xi-skel xi-skel-line xi-skel-line-mid" />
          </div>
        </section>

        {/* Stats row skeleton */}
        <div className="reading-stats-row" aria-hidden="true" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="reading-stat-card xi-skel-card" style={{ minWidth: 100, flex: 1 }}>
              <div className="xi-skel" style={{ width: 18, height: 18, borderRadius: 4, marginBottom: 8 }} />
              <div className="xi-skel" style={{ height: 22, width: 50, marginBottom: 6 }} />
              <div className="xi-skel" style={{ height: 12, width: "80%" }} />
            </div>
          ))}
        </div>

        {/* Story cards skeleton */}
        <div className="story-grid" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="story-card xi-skel-card">
              <div className="xi-skel xi-skel-cover" />
              <div className="story-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div className="xi-skel" style={{ height: 12, width: "60%", marginBottom: 8 }} />
                    <div className="xi-skel" style={{ height: 16, width: "85%" }} />
                  </div>
                  <div className="xi-skel" style={{ width: 44, height: 22, borderRadius: 20, marginLeft: 8 }} />
                </div>
                <div className="xi-skel xi-skel-line xi-skel-line-mid" style={{ marginBottom: 6 }} />
                <div className="xi-skel" style={{ height: 4, width: "100%", borderRadius: 4, marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
