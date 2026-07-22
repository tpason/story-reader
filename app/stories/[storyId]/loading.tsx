export default function StoryDetailLoading() {
  return (
    <main className="app-shell story-detail-shell xi-route-loading" aria-busy="true" aria-label="Đang tải">
      <header className="topbar topbar-skel topbar-modern" aria-hidden="true">
        <div className="brand">
          <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          <div className="xi-skel" style={{ width: 110, height: 16 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="xi-skel" style={{ width: 24, height: 24, borderRadius: "50%" }} />
        <div className="xi-skel" style={{ width: 80, height: 28, borderRadius: 20 }} />
      </header>

      <div className="page-wrap">
        <section className="story-detail-hero story-detail-hero-skel" aria-hidden="true">
          <div className="xi-skel story-skel-cover" />
          <div className="story-detail-copy story-skel-copy">
            <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 12 }} />
            <div className="xi-skel" style={{ height: 28, width: "70%", marginBottom: 12, borderRadius: 6 }} />
            <div className="xi-skel" style={{ height: 28, width: "45%", marginBottom: 20, borderRadius: 6 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {[80, 90, 70, 110].map((w, i) => (
                <div key={i} className="xi-skel" style={{ width: w, height: 22, borderRadius: 20 }} />
              ))}
            </div>
            <div className="xi-skel xi-skel-line" style={{ marginBottom: 8 }} />
            <div className="xi-skel xi-skel-line xi-skel-line-mid" style={{ marginBottom: 8 }} />
            <div className="xi-skel xi-skel-line xi-skel-line-short" style={{ marginBottom: 20 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <div className="xi-skel" style={{ width: 130, height: 38, borderRadius: 8 }} />
              <div className="xi-skel" style={{ width: 100, height: 38, borderRadius: 8 }} />
            </div>
          </div>
        </section>

        <section className="library-list-section" aria-hidden="true" style={{ marginTop: 32 }}>
          <div className="section-heading-row story-list-heading">
            <div>
              <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 8 }} />
              <div className="xi-skel" style={{ height: 22, width: 140 }} />
            </div>
            <div className="xi-skel" style={{ width: 80, height: 26, borderRadius: 20 }} />
          </div>
          <div className="story-skel-chapter-list">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="story-skel-chapter-row">
                <div className="xi-skel" style={{ height: 14, width: `${55 + (i % 4) * 10}%` }} />
                <div className="xi-skel" style={{ height: 12, width: 60 }} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
