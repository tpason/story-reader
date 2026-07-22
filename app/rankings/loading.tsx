/** Compact rankings loading — full viewport so layout footer stays off-screen on mobile. */
export default function RankingsLoading() {
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
        <div className="xi-skel" style={{ height: 26, width: "55%", marginBottom: 16, maxWidth: 220 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {[72, 88, 64, 80].map((w, i) => (
            <div key={i} className="xi-skel" style={{ width: w, height: 30, borderRadius: 20 }} />
          ))}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="xi-skel-card"
              style={{ display: "flex", gap: 12, alignItems: "center", padding: 10, borderRadius: 12 }}
            >
              <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: 8 }} />
              <div className="xi-skel" style={{ width: 48, aspectRatio: "2/3", borderRadius: 8 }} />
              <div style={{ flex: 1, display: "grid", gap: 6 }}>
                <div className="xi-skel" style={{ height: 14, width: "70%" }} />
                <div className="xi-skel" style={{ height: 12, width: "45%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
