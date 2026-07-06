export default function UpdatesLoading() {
  return (
    <main className="app-shell">
      <header className="topbar topbar-skel" aria-hidden="true">
        <div className="brand">
          <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          <div className="xi-skel" style={{ width: 120, height: 16 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="xi-skel" style={{ width: 24, height: 24, borderRadius: "50%" }} />
        <div className="xi-skel" style={{ width: 80, height: 28, borderRadius: 20 }} />
      </header>

      <div className="page-wrap">
        <section className="library-header updates-header" aria-hidden="true">
          <div>
            <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
            <div className="xi-skel" style={{ height: 28, width: "60%", marginBottom: 10 }} />
            <div className="xi-skel xi-skel-line xi-skel-line-mid" />
          </div>
          <div className="updates-summary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="xi-skel" style={{ width: 18, height: 18, borderRadius: 4 }} />
            <div className="xi-skel" style={{ width: 30, height: 22 }} />
            <div className="xi-skel" style={{ width: 120, height: 14 }} />
          </div>
        </section>

        <section className="updates-list" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <article key={i} className="update-card xi-skel-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 12, padding: "12px 14px 8px" }}>
                <div className="xi-skel" style={{ width: 64, height: 96, borderRadius: 8 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div className="xi-skel" style={{ height: 16, width: "70%" }} />
                    <div className="xi-skel" style={{ width: 56, height: 22, borderRadius: 20, flexShrink: 0 }} />
                  </div>
                  <div className="xi-skel xi-skel-line xi-skel-line-mid" />
                  <div className="xi-skel xi-skel-line xi-skel-line-short" />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "7px 12px 9px", borderTop: "1px solid var(--hairline)" }}>
                <div className="xi-skel" style={{ width: 108, height: 28, borderRadius: 999 }} />
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
