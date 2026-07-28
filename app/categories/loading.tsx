/** Categories index loading shell — mirrors category slug skeleton density. */
export default function CategoriesIndexLoading() {
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

      <div className="page-wrap">
        <section className="library-header categories-index-header" aria-hidden="true">
          <div>
            <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
            <div className="xi-skel" style={{ height: 28, width: 260, marginBottom: 10 }} />
            <div className="xi-skel xi-skel-line xi-skel-line-mid" />
          </div>
        </section>

        <nav className="category-index-grid" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="xi-skel-card" style={{ padding: 14, borderRadius: 14 }}>
              <div className="xi-skel" style={{ height: 14, width: "70%", marginBottom: 8 }} />
              <div className="xi-skel" style={{ height: 12, width: "40%" }} />
            </div>
          ))}
        </nav>
      </div>
    </main>
  );
}
