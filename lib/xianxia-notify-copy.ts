/** Shared Linh tin / realtime notification copy — tiên hiệp tone, one source of truth. */

export const NOTIFY_COPY = {
  eyebrow: "Linh tin",
  panelTitle: "Chương mới",
  pageTitle: "Linh tin chương mới",
  pageSubtitle: "Gom truyện đạo hữu đang tu hoặc theo dõi. Còn chương chưa hấp thu.",
  sectionReading: "Đang tu",
  sectionFollow: "Theo dõi",
  shimmerLegend: "Linh khí mới. Truyện vừa cập nhật",
  shimmerDismiss: "Đã hiểu",
  empty: "Thiên hạ yên tĩnh. Chưa có linh tin mới.",
  emptyHint: "Đọc hoặc theo dõi truyện để nhận linh tin khi có chương mới.",
  live: "Thông linh",
  polling: "Thu linh",
  unreadBadge: (n: number) => `Mới +${n}`,
  readNext: (chapter: number) => `Tiếp tục chương ${chapter}`,
  bellAria: "Linh tin chương mới",
  viewAll: "Mở Tàng linh tin",
  markCaughtUp: "Đón linh tin",
  markCaughtUpHint: "Ghi nhận đã biết chương mới. Ẩn tới khi có chương tiếp theo",
  markAllCaughtUp: "Đón hết linh tin",
  markAllCaughtUpHint: "Ghi nhận đã biết mọi chương mới trong danh sách",
  engageTitle: "Kết linh tin",
  engageBody: "Theo dõi và bật linh tin để biết ngay khi có chương mới, kể cả khi đóng quyển.",
  engageCta: "Theo dõi & bật linh tin",
  engageLoginTitle: "Nhập môn để nhận linh tin",
  engageLoginBody: "Kết bái đạo hữu để theo dõi truyện và bật thông báo ngoài tab.",
  engageLoginCta: "Nhập môn",
  pushTitle: "Linh tin ngoài tab",
  pushBody: "Đạo hữu đang tu truyện này. Bật linh tin để không lỡ chương mới.",
  pushCta: "Bật linh tin"
} as const;

export const SHIMMER_LEGEND_SESSION_KEY = "xi-shimmer-legend-dismissed";
