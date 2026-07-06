export default function AccountLoading() {
  return (
    <main className="app-shell account-shell">
      <header className="topbar topbar-modern topbar-skel" aria-hidden="true">
        <div className="topbar-modern-inner">
          <div className="brand topbar-modern-brand">
            <div className="xi-skel" style={{ width: 38, height: 38, borderRadius: 10 }} />
            <div className="xi-skel" style={{ width: 120, height: 16 }} />
          </div>
          <div className="xi-skel" style={{ height: 42, borderRadius: 999, flex: 1, maxWidth: 360 }} />
          <div className="xi-skel" style={{ width: 140, height: 42, borderRadius: 999 }} />
        </div>
      </header>

      <div className="page-wrap account-page-wrap" aria-hidden="true">
        <section className="account-panel">
          <div className="auth-heading account-heading">
            <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
            <div className="xi-skel" style={{ height: 32, width: "min(100%, 520px)", marginBottom: 10 }} />
            <div className="xi-skel xi-skel-line xi-skel-line-mid" />
          </div>

          <div className="account-skel-card">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div className="xi-skel" style={{ width: 52, height: 52, borderRadius: "50%" }} />
              <div style={{ flex: 1 }}>
                <div className="xi-skel" style={{ height: 16, width: "55%", marginBottom: 6 }} />
                <div className="xi-skel" style={{ height: 12, width: "40%" }} />
              </div>
            </div>
            <div className="xi-skel" style={{ height: 36, width: "100%", borderRadius: 8, marginBottom: 10 }} />
            <div className="xi-skel" style={{ height: 36, width: "100%", borderRadius: 8 }} />
          </div>

          <div className="account-skel-card">
            <div className="xi-skel" style={{ height: 15, width: "45%", marginBottom: 16 }} />
            <div className="xi-skel" style={{ height: 8, width: "100%", borderRadius: 4, marginBottom: 8 }} />
            <div className="xi-skel" style={{ height: 11, width: "50%" }} />
          </div>

          <div className="account-skel-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="account-skel-card account-skel-card-compact">
                <div className="xi-skel" style={{ width: 18, height: 18, borderRadius: 4, marginBottom: 8 }} />
                <div className="xi-skel" style={{ height: 22, width: 50, marginBottom: 4 }} />
                <div className="xi-skel" style={{ height: 11, width: "70%" }} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
