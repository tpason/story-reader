export default function AccountLoading() {
  return (
    <main className="auth-shell">
      <header className="topbar account-topbar topbar-skel" aria-hidden="true">
        <div className="brand">
          <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          <div className="xi-skel" style={{ width: 110, height: 16 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="xi-skel" style={{ width: 24, height: 24, borderRadius: "50%" }} />
        <div className="xi-skel" style={{ width: 80, height: 28, borderRadius: 20 }} />
      </header>

      <section className="auth-panel" aria-hidden="true">
        <div className="auth-heading">
          <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
          <div className="xi-skel" style={{ height: 26, width: "75%", marginBottom: 10 }} />
          <div className="xi-skel xi-skel-line xi-skel-line-mid" />
        </div>

        {/* Auth card skeleton */}
        <div style={{ background: "var(--bg-secondary, rgba(255,255,255,0.6))", border: "0.5px solid var(--hairline)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div className="xi-skel" style={{ width: 44, height: 44, borderRadius: "50%" }} />
            <div style={{ flex: 1 }}>
              <div className="xi-skel" style={{ height: 16, width: "55%", marginBottom: 6 }} />
              <div className="xi-skel" style={{ height: 12, width: "40%" }} />
            </div>
          </div>
          <div className="xi-skel" style={{ height: 36, width: "100%", borderRadius: 8, marginBottom: 10 }} />
          <div className="xi-skel" style={{ height: 36, width: "100%", borderRadius: 8 }} />
        </div>

        {/* Cultivation panel skeleton */}
        <div style={{ background: "var(--bg-secondary, rgba(255,255,255,0.6))", border: "0.5px solid var(--hairline)", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div className="xi-skel" style={{ width: 40, height: 40, borderRadius: "50%" }} />
            <div style={{ flex: 1 }}>
              <div className="xi-skel" style={{ height: 15, width: "45%", marginBottom: 6 }} />
              <div className="xi-skel" style={{ height: 11, width: "30%" }} />
            </div>
          </div>
          <div className="xi-skel" style={{ height: 8, width: "100%", borderRadius: 4, marginBottom: 8 }} />
          <div className="xi-skel" style={{ height: 11, width: "50%" }} />
        </div>

        {/* Stats panel skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: "var(--bg-secondary, rgba(255,255,255,0.6))", border: "0.5px solid var(--hairline)", borderRadius: 10, padding: "12px 14px" }}>
              <div className="xi-skel" style={{ width: 18, height: 18, borderRadius: 4, marginBottom: 8 }} />
              <div className="xi-skel" style={{ height: 22, width: 50, marginBottom: 4 }} />
              <div className="xi-skel" style={{ height: 11, width: "70%" }} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
