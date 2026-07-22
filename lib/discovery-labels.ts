/** Reader-facing discovery copy (internal kind stays `polished`). */
export const DISCOVERY_POLISHED_KICKER = "Mới tinh luyện";
export const DISCOVERY_POLISHED_TAB = "Mới tinh luyện";
export const DISCOVERY_POLISHED_HERO = "Truyện mới tinh luyện";
export const DISCOVERY_POLISHED_SECTION = "Bản đọc mới";
export const DISCOVERY_POLISHED_RAIL_TITLE = "Mới tinh luyện";
export const DISCOVERY_POLISHED_FILTER = "Đã tinh luyện";
export const DISCOVERY_UPDATED_KICKER = "Chương mới";
export const DISCOVERY_UPDATED_TAB = "Vừa cập nhật";
export const DISCOVERY_UPDATED_HERO = "Truyện vừa cập nhật";
export const DISCOVERY_UPDATED_SECTION = "Chương vừa cập nhật";

export function discoveryPolishedChapterLabel(count: number): string {
  return `${count} chương bản đọc`;
}
