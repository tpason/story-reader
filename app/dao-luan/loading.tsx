/** Dao luận loading shell. */
export default function DaoLuanLoading() {
  return (
    <main className="app-shell xi-route-loading" aria-busy="true" aria-label="Đang tải">
      <header className="topbar topbar-skel" aria-hidden="true">
        <div className="brand">
          <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          <div className="xi-skel" style={{ width: 110, height: 16 }} />
        </div>
        <div style={{ flex: 1 }} />
        <div className="xi-skel" style={{ width: 80, height: 28, borderRadius: 20 }} />
      </header>

      <div className="page-wrap dao-luan-page">
        <section className="dao-luan-header" aria-hidden="true">
          <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
          <div className="xi-skel" style={{ height: 28, width: 240, marginBottom: 10 }} />
          <div className="xi-skel xi-skel-line xi-skel-line-mid" />
        </section>

        <ul className="dao-luan-list" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i}>
              <div className="xi-skel-card" style={{ padding: 14, borderRadius: 14, display: "grid", gap: 8 }}>
                <div className="xi-skel" style={{ height: 12, width: "35%" }} />
                <div className="xi-skel" style={{ height: 14, width: "90%" }} />
                <div className="xi-skel" style={{ height: 12, width: "55%" }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
