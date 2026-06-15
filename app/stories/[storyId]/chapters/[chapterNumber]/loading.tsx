export default function ReaderLoading() {
  return (
    <div className="reader-shell reader-skel-shell" aria-hidden="true">
      {/* Reader topbar */}
      <div className="reader-topbar reader-skel-topbar">
        <div className="xi-skel" style={{ width: 28, height: 28, borderRadius: "50%" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="xi-skel" style={{ height: 13, width: 180 }} />
          <div className="xi-skel" style={{ height: 11, width: 100 }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="xi-skel" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="xi-skel" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="xi-skel" style={{ width: 32, height: 32, borderRadius: 8 }} />
        </div>
      </div>

      {/* Content area */}
      <div className="reader-skel-content">
        <div className="reader-skel-chapter-title">
          <div className="xi-skel" style={{ height: 13, width: 80, marginBottom: 8 }} />
          <div className="xi-skel" style={{ height: 22, width: "60%", marginBottom: 32 }} />
        </div>

        {/* Paragraph blocks */}
        {Array.from({ length: 6 }).map((_, p) => (
          <div key={p} className="reader-skel-para">
            <div className="xi-skel xi-skel-line" />
            <div className="xi-skel xi-skel-line" />
            <div className="xi-skel xi-skel-line" />
            <div className="xi-skel xi-skel-line xi-skel-line-mid" />
          </div>
        ))}
      </div>

      {/* Bottom nav stub */}
      <div className="reader-skel-footnav">
        <div className="xi-skel" style={{ width: 90, height: 36, borderRadius: 8 }} />
        <div className="xi-skel" style={{ width: 90, height: 36, borderRadius: 8 }} />
      </div>
    </div>
  );
}
