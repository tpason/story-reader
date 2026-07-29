/**
 * Author studio route loading — keep shell chrome familiar without touching public pages.
 */
export default function AuthorLoading() {
  return (
    <main className="app-shell xi-route-loading" aria-busy="true" aria-label="Đang tải linh các viết">
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

      <div className="page-wrap" aria-hidden="true">
        <div className="auth-heading" style={{ marginBottom: 20 }}>
          <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10 }} />
          <div className="xi-skel" style={{ height: 30, width: "min(100%, 420px)", marginBottom: 10 }} />
          <div className="xi-skel xi-skel-line xi-skel-line-mid" />
        </div>
        <div className="xi-skel" style={{ height: 120, width: "100%", borderRadius: 16, marginBottom: 14 }} />
        <div className="xi-skel" style={{ height: 120, width: "100%", borderRadius: 16, marginBottom: 14 }} />
        <div className="xi-skel" style={{ height: 72, width: "100%", borderRadius: 12 }} />
      </div>
    </main>
  );
}
