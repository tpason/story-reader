export default function DiscoverLoading() {
  return (
    <main className="app-shell">
      <header className="topbar topbar-skel" aria-hidden="true">
        <div className="brand">
          <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          <div className="xi-skel" style={{ width: 110, height: 16 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="xi-skel" style={{ width: 80, height: 28, borderRadius: 20 }} />
      </header>

      <div className="page-wrap">
        <section className="library-header discover-header" aria-hidden="true">
          <div>
            <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
            <div className="xi-skel" style={{ height: 28, width: 260, marginBottom: 10 }} />
            <div className="xi-skel xi-skel-line xi-skel-line-mid" />
          </div>
          <div className="filters discover-tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[80, 100, 70, 90, 80].map((w, i) => (
              <div key={i} className="xi-skel" style={{ width: w, height: 32, borderRadius: 20 }} />
            ))}
          </div>
        </section>

        <section className="library-list-section" aria-hidden="true">
          <div className="section-heading-row story-list-heading" style={{ marginBottom: 16 }}>
            <div>
              <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 8 }} />
              <div className="xi-skel" style={{ height: 22, width: 180 }} />
            </div>
            <div className="xi-skel" style={{ width: 80, height: 26, borderRadius: 20 }} />
          </div>

          <div className="discover-list">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="discover-list-card xi-skel-card" style={{ display: "flex", gap: 12 }}>
                <div className="xi-skel" style={{ width: 64, minWidth: 64, aspectRatio: "2/3", borderRadius: 8 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                  <div className="xi-skel" style={{ height: 12, width: "40%" }} />
                  <div className="xi-skel" style={{ height: 16, width: "75%" }} />
                  <div className="xi-skel" style={{ height: 12, width: "55%" }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
