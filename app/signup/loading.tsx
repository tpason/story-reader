export default function SignupLoading() {
  return (
    <main className="auth-shell auth-shell--portal xi-route-loading" aria-busy="true" aria-label="Đang tải">
      <div className="auth-panel" aria-hidden="true">
        <div className="auth-heading">
          <div className="xi-skel xi-skel-eyebrow" style={{ marginBottom: 10, width: 88 }} />
          <div className="xi-skel" style={{ height: 28, width: "75%", marginBottom: 10, maxWidth: 300 }} />
          <div className="xi-skel xi-skel-line xi-skel-line-mid" />
        </div>
        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          <div className="xi-skel" style={{ height: 44, width: "100%", borderRadius: 10 }} />
          <div className="xi-skel" style={{ height: 44, width: "100%", borderRadius: 10 }} />
          <div className="xi-skel" style={{ height: 44, width: "100%", borderRadius: 10 }} />
          <div className="xi-skel" style={{ height: 46, width: "100%", borderRadius: 999, marginTop: 6 }} />
        </div>
        <div className="xi-skel" style={{ height: 14, width: "60%", marginTop: 18, marginInline: "auto" }} />
      </div>
    </main>
  );
}
