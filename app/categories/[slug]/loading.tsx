export default function CategoryLoading() {
  return (
    <main className="app-shell xi-route-loading" aria-busy="true" aria-label="Đang tải">
      <header className="topbar topbar-skel" aria-hidden="true">
        <div className="brand">
          <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          <div className="xi-skel" style={{ width: 110, height: 16 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="xi-skel" style={{ width: 24, height: 24, borderRadius: "50%" }} />
        <div className="xi-skel" style={{ width: 80, height: 28, borderRadius: 20 }} />
      </header>

      <div className="page-wrap">
        <section className="library-header" aria-hidden="true">
          <div>
            <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
            <div className="xi-skel" style={{ height: 30, width: "45%", marginBottom: 10 }} />
            <div className="xi-skel xi-skel-line xi-skel-line-short" />
          </div>
          <div className="filters category-sort-row" style={{ display: "flex", gap: 8 }}>
            {[70, 80, 70, 60].map((w, i) => (
              <div key={i} className="xi-skel" style={{ width: w, height: 32, borderRadius: 20 }} />
            ))}
          </div>
        </section>

        <div className="story-grid" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="story-card xi-skel-card">
              <div className="xi-skel xi-skel-cover" />
              <div className="story-card-body">
                <div className="xi-skel" style={{ height: 12, width: "55%", marginBottom: 8 }} />
                <div className="xi-skel" style={{ height: 16, width: "85%", marginBottom: 8 }} />
                <div className="xi-skel xi-skel-line xi-skel-line-mid" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
