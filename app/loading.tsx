/** Lightweight route progress — avoids full-screen XianxiaLoader blanking the page between hops. */
export default function Loading() {
  return (
    <div className="xi-route-progress" role="status" aria-label="Đang tải">
      <span className="xi-route-progress-bar" />
    </div>
  );
}
