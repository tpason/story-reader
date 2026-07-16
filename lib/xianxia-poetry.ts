/**
 * Decorative homepage poems — 6 pillars × 4 Hán-Việt syllables.
 * Read top→bottom per pillar, pillars left→right.
 * Curated / original xianxia-flavored phrases (not live crawl).
 */

export type PoetryColumn = readonly [string, string, string, string];

export type XianxiaPoem = {
  id: string;
  /** Optional source hint for maintainers */
  note?: string;
  columns: readonly [
    PoetryColumn,
    PoetryColumn,
    PoetryColumn,
    PoetryColumn,
    PoetryColumn,
    PoetryColumn,
  ];
};

export const XIANXIA_POEMS: readonly XianxiaPoem[] = [
  {
    id: "linh-khi-tu-dinh",
    note: "original homepage default",
    columns: [
      ["Linh", "Khí", "Tụ", "Đỉnh"],
      ["Thần", "Kiếm", "Bất", "Xuất"],
      ["Vạn", "Ma", "Tự", "Diệt"],
      ["Tu", "Chân", "Ngàn", "Năm"],
      ["Nhất", "Niệm", "Thành", "Tiên"],
      ["Thiên", "Thư", "Khai", "Quyển"],
    ],
  },
  {
    id: "bach-van-tieu-dao",
    columns: [
      ["Bạch", "Vân", "Thiên", "Ngoại"],
      ["Thanh", "Phong", "Vạn", "Dặm"],
      ["Kiếm", "Khí", "Hoành", "Không"],
      ["Đạo", "Tâm", "Bất", "Di"],
      ["Cửu", "Thiên", "Huyền", "Nữ"],
      ["Linh", "Quyển", "Trùng", "Khai"],
    ],
  },
  {
    id: "tuyet-nguyet-hoa",
    columns: [
      ["Tuyết", "Nguyệt", "Hoa", "Khai"],
      ["Hàn", "Giang", "Độc", "Điếu"],
      ["Cô", "Nhạn", "Nam", "Phi"],
      ["Mộng", "Hồi", "Cố", "Lý"],
      ["Nhất", "Ấn", "Phá", "Ảo"],
      ["Thiên", "Cơ", "Bất", "Lậu"],
    ],
  },
  {
    id: "hoang-ha-lac-nhat",
    columns: [
      ["Hoàng", "Hà", "Chi", "Thủy"],
      ["Thiên", "Thượng", "Lai", "Dã"],
      ["Bôn", "Lưu", "Đáo", "Hải"],
      ["Bất", "Phục", "Hồi", "Dã"],
      ["Tu", "Sĩ", "Nhất", "Niệm"],
      ["Vượt", "Vạn", "Trùng", "Sơn"],
    ],
  },
  {
    id: "tinh-ha-lac-cuu",
    columns: [
      ["Tinh", "Hà", "Lạc", "Cửu"],
      ["Thiên", "Kiếm", "Xuất", "Kiêu"],
      ["Ma", "Vực", "Trầm", "Luân"],
      ["Tiên", "Môn", "Bế", "Ấn"],
      ["Đạo", "Hữu", "Đồng", "Hành"],
      ["Linh", "Thư", "Trường", "Tồn"],
    ],
  },
  {
    id: "sam-son-tu-van",
    columns: [
      ["Sâm", "Sơn", "Tự", "Vân"],
      ["Thâm", "Cốc", "Ẩn", "Long"],
      ["Thanh", "Đăng", "Cổ", "Phật"],
      ["Hồng", "Trần", "Bất", "Nhiễm"],
      ["Nhất", "Chén", "Linh", "Tuyền"],
      ["Vạn", "Kiếp", "Tu", "Chân"],
    ],
  },
  {
    id: "kiem-lai-thien-ngoai",
    columns: [
      ["Kiếm", "Lai", "Thiên", "Ngoại"],
      ["Huyết", "Nhiễm", "Càn", "Khôn"],
      ["Ma", "Chủ", "Khiếp", "Sắc"],
      ["Tiên", "Đế", "Kinh", "Hoàng"],
      ["Nhất", "Trảm", "Vạn", "Pháp"],
      ["Thiên", "Thư", "Chứng", "Đạo"],
    ],
  },
  {
    id: "dao-phap-tu-nhien",
    columns: [
      ["Đạo", "Pháp", "Tự", "Nhiên"],
      ["Vô", "Vi", "Nhi", "Trị"],
      ["Thanh", "Tâm", "Quả", "Dục"],
      ["Huyền", "Quan", "Nhất", "Khiếu"],
      ["Kim", "Đan", "Cửu", "Chuyển"],
      ["Phi", "Thăng", "Cửu", "Thiên"],
    ],
  },
  {
    id: "nguyet-ha-doc-am",
    columns: [
      ["Nguyệt", "Hạ", "Độc", "Ẩm"],
      ["Hoa", "Tiền", "Độc", "Tọa"],
      ["Cô", "Ảnh", "Tự", "Liên"],
      ["Thiên", "Nhai", "Hải", "Giác"],
      ["Mộng", "Trung", "Phùng", "Tiên"],
      ["Tỉnh", "Lai", "Khai", "Quyển"],
    ],
  },
  {
    id: "cuu-chuyen-huyen-cong",
    columns: [
      ["Cửu", "Chuyển", "Huyền", "Công"],
      ["Thâu", "Thiên", "Hoán", "Nhật"],
      ["Địa", "Hỏa", "Thiên", "Lôi"],
      ["Ngũ", "Hành", "Tương", "Sinh"],
      ["Linh", "Căn", "Thiên", "Phú"],
      ["Đại", "Đạo", "Vô", "Cùng"],
    ],
  },
  {
    id: "van-ly-truong-phong",
    columns: [
      ["Vạn", "Dặm", "Trường", "Phong"],
      ["Nhất", "Khứ", "Bất", "Hoàn"],
      ["Giang", "Hồ", "Hiểm", "Ác"],
      ["Nhân", "Tâm", "Nan", "Đoán"],
      ["Kiếm", "Tại", "Nhân", "Tại"],
      ["Thư", "Tại", "Đạo", "Tồn"],
    ],
  },
  {
    id: "thanh-loan-bach-hac",
    columns: [
      ["Thanh", "Loan", "Bạch", "Hạc"],
      ["Phi", "Độ", "Thiên", "Hà"],
      ["Tiên", "Am", "Ẩn", "Hiện"],
      ["Linh", "Khí", "Bàng", "Bạc"],
      ["Nhất", "Khúc", "Tiên", "Nhạc"],
      ["Khai", "Mở", "Thiên", "Môn"],
    ],
  },
  {
    id: "hong-tran-tu-kho",
    columns: [
      ["Hồng", "Trần", "Tứ", "Khổ"],
      ["Luân", "Hồi", "Bất", "Tức"],
      ["Tu", "Hành", "Nhất", "Lộ"],
      ["Thiên", "Nhân", "Giao", "Chiến"],
      ["Xá", "Thân", "Cầu", "Đạo"],
      ["Linh", "Quyển", "Đồng", "Hành"],
    ],
  },
  {
    id: "dong-phu-thanh-u",
    columns: [
      ["Động", "Phủ", "Thanh", "U"],
      ["Bạch", "Vân", "Thâm", "Xứ"],
      ["Đan", "Lô", "Trường", "Nhiệt"],
      ["Linh", "Thảo", "Mạn", "Sơn"],
      ["Nhất", "Viên", "Kim", "Đan"],
      ["Trường", "Sinh", "Bất", "Lão"],
    ],
  },
  {
    id: "thien-dao-vo-tinh",
    columns: [
      ["Thiên", "Đạo", "Vô", "Tình"],
      ["Nhân", "Tâm", "Hữu", "Niệm"],
      ["Nghịch", "Thiên", "Cải", "Mệnh"],
      ["Phá", "Ảo", "Kiến", "Chân"],
      ["Vạn", "Kiếp", "Bất", "Di"],
      ["Thư", "Trung", "Hữu", "Đạo"],
    ],
  },
  {
    id: "sam-la-van-tuong",
    columns: [
      ["Sâm", "La", "Vạn", "Tượng"],
      ["Giai", "Thị", "Không", "Hoa"],
      ["Nhất", "Hoa", "Nhất", "Thế"],
      ["Nhất", "Diệp", "Nhất", "Như"],
      ["Ngộ", "Đạo", "Vô", "Ngôn"],
      ["Đọc", "Thư", "Hữu", "Ngộ"],
    ],
  },
  {
    id: "hac-minh-cuu-cao",
    columns: [
      ["Hạc", "Minh", "Cửu", "Cao"],
      ["Phong", "Xuy", "Vạn", "Lý"],
      ["Tuyết", "Phủ", "Thiên", "Sơn"],
      ["Nguyệt", "Chiếu", "Cô", "Phong"],
      ["Đạo", "Tâm", "Như", "Tuyết"],
      ["Linh", "Thư", "Như", "Nguyệt"],
    ],
  },
  {
    id: "pha-tran-xuat-the",
    columns: [
      ["Phá", "Trần", "Xuất", "Thế"],
      ["Siêu", "Phàm", "Nhập", "Thánh"],
      ["Ngũ", "Hành", "Đại", "Chuyển"],
      ["Âm", "Dương", "Nghịch", "Chuyển"],
      ["Thiên", "Mệnh", "Khả", "Nghịch"],
      ["Quyển", "Trung", "Hữu", "Kiếm"],
    ],
  },
  {
    id: "co-kiem-tram-ma",
    columns: [
      ["Cổ", "Kiếm", "Trảm", "Ma"],
      ["Huyền", "Quang", "Phá", "Ám"],
      ["Ma", "Khí", "Tiêu", "Tán"],
      ["Chính", "Đạo", "Trường", "Minh"],
      ["Nhất", "Niên", "Nhất", "Kiếm"],
      ["Thiên", "Thư", "Chứng", "Tâm"],
    ],
  },
  {
    id: "van-vat-sinh-truong",
    columns: [
      ["Vạn", "Vật", "Sinh", "Trưởng"],
      ["Xuân", "Hồi", "Đại", "Địa"],
      ["Linh", "Vũ", "Nhuận", "Vật"],
      ["Tiên", "Hoa", "Độ", "Thế"],
      ["Nhân", "Gian", "Tu", "Duyên"],
      ["Khai", "Quyển", "Phùng", "Tiên"],
    ],
  },
  {
    id: "tuyet-kiem-vo-tinh",
    columns: [
      ["Tuyệt", "Kiếm", "Vô", "Tình"],
      ["Nhất", "Xuất", "Tất", "Trảm"],
      ["Huyết", "Nhiễm", "Thiên", "Hoang"],
      ["Oán", "Niệm", "Trường", "Tồn"],
      ["Đạo", "Tâm", "Bất", "Loạn"],
      ["Thư", "Kiếm", "Đồng", "Tu"],
    ],
  },
  {
    id: "linh-son-tien-dao",
    columns: [
      ["Linh", "Sơn", "Tiên", "Đảo"],
      ["Bích", "Hải", "Vô", "Nhai"],
      ["Bạch", "Lộc", "Đạp", "Vân"],
      ["Thanh", "Loan", "Phụ", "Tiên"],
      ["Cửu", "Chuyển", "Hoàn", "Đan"],
      ["Trường", "Sinh", "Chi", "Lộ"],
    ],
  },
  {
    id: "thien-co-bat-kha",
    columns: [
      ["Thiên", "Cơ", "Bất", "Khả"],
      ["Lậu", "Thiên", "Cơ", "Giả"],
      ["Tử", "Vô", "Toàn", "Thi"],
      ["Đạo", "Hữu", "Thận", "Ngôn"],
      ["Trầm", "Mặc", "Như", "Kim"],
      ["Khai", "Quyển", "Như", "Đạo"],
    ],
  },
  {
    id: "nhat-khi-hoa-tam",
    columns: [
      ["Nhất", "Khí", "Hóa", "Tam"],
      ["Tam", "Sinh", "Vạn", "Vật"],
      ["Vạn", "Vật", "Quy", "Nhất"],
      ["Nhất", "Quy", "Vô", "Cực"],
      ["Vô", "Cực", "Sinh", "Đạo"],
      ["Đạo", "Tại", "Linh", "Quyển"],
    ],
  },
  {
    id: "phong-hoa-tuyet-nguyet",
    columns: [
      ["Phong", "Hoa", "Tuyết", "Nguyệt"],
      ["Nhân", "Gian", "Tứ", "Tuyệt"],
      ["Kiếm", "Khí", "Như", "Hồng"],
      ["Đạo", "Tâm", "Như", "Ngọc"],
      ["Tu", "Hành", "Như", "Mộng"],
      ["Giác", "Lai", "Khai", "Thư"],
    ],
  },
  {
    id: "cuu-u-dia-phu",
    columns: [
      ["Cửu", "U", "Địa", "Phủ"],
      ["Hoàng", "Tuyền", "Lộ", "Hẹp"],
      ["Oán", "Hồn", "Trường", "Khóc"],
      ["Nghiệp", "Hỏa", "Bất", "Diệt"],
      ["Chính", "Đạo", "Phá", "Ảm"],
      ["Thiên", "Thư", "Độ", "Hồn"],
    ],
  },
  {
    id: "thanh-minh-thoi-tiet",
    columns: [
      ["Thanh", "Minh", "Thời", "Tiết"],
      ["Vũ", "Phần", "Phần", "Nha"],
      ["Lộ", "Thượng", "Hành", "Nhân"],
      ["Hồn", "Dục", "Đoạn", "Hồn"],
      ["Đạo", "Lộ", "Man", "Man"],
      ["Quyển", "Trung", "Tầm", "Lộ"],
    ],
  },
  {
    id: "kim-lan-ket-nghia",
    columns: [
      ["Kim", "Lan", "Kết", "Nghĩa"],
      ["Sinh", "Tử", "Đồng", "Tâm"],
      ["Giang", "Hồ", "Nghĩa", "Khí"],
      ["Thiên", "Địa", "Vi", "Chứng"],
      ["Đồng", "Tu", "Đồng", "Chứng"],
      ["Linh", "Quyển", "Đồng", "Môn"],
    ],
  },
  {
    id: "vo-kiem-thang-huu",
    columns: [
      ["Vô", "Kiếm", "Thắng", "Hữu"],
      ["Đại", "Âm", "Hy", "Thanh"],
      ["Đại", "Tượng", "Vô", "Hình"],
      ["Đạo", "Ẩn", "Vô", "Danh"],
      ["Tâm", "Kiếm", "Xuất", "Thế"],
      ["Thư", "Trung", "Hữu", "Kiếm"],
    ],
  },
  {
    id: "tran-the-nhu-moc",
    columns: [
      ["Trần", "Thế", "Như", "Mộng"],
      ["Tỉnh", "Lai", "Hư", "Vô"],
      ["Hoa", "Khai", "Hoa", "Lạc"],
      ["Vân", "Tụ", "Vân", "Tan"],
      ["Duyên", "Khởi", "Duyên", "Diệt"],
      ["Thư", "Mở", "Duyên", "Lại"],
    ],
  },
  {
    id: "bac-minh-huu-ngu",
    columns: [
      ["Bắc", "Minh", "Hữu", "Ngư"],
      ["Kỳ", "Danh", "Vi", "Côn"],
      ["Hóa", "Nhi", "Vi", "Điểu"],
      ["Kỳ", "Danh", "Vi", "Bằng"],
      ["Bằng", "Phi", "Cửu", "Vạn"],
      ["Thư", "Phi", "Vạn", "Dặm"],
    ],
  },
  {
    id: "thien-nhan-hop-nhat",
    columns: [
      ["Thiên", "Nhân", "Hợp", "Nhất"],
      ["Vạn", "Pháp", "Quy", "Tông"],
      ["Nội", "Quan", "Tự", "Tâm"],
      ["Ngoại", "Ứng", "Thiên", "Địa"],
      ["Đan", "Thành", "Xuất", "Khiếu"],
      ["Khai", "Quyển", "Ngộ", "Đạo"],
    ],
  },
  {
    id: "co-moc-phung-xuan",
    columns: [
      ["Cổ", "Mộc", "Phùng", "Xuân"],
      ["Khô", "Chi", "Lại", "Nở"],
      ["Tuyệt", "Xứ", "Phùng", "Sinh"],
      ["Liễu", "Ám", "Hoa", "Minh"],
      ["Tu", "Sĩ", "Bất", "Nản"],
      ["Quyển", "Hậu", "Hữu", "Lộ"],
    ],
  },
  {
    id: "nhat-kiem-phong-hau",
    columns: [
      ["Nhất", "Kiếm", "Phong", "Hầu"],
      ["Thiên", "Hạ", "Vô", "Địch"],
      ["Ma", "Quân", "Khiếp", "Đảm"],
      ["Tiên", "Môn", "Kính", "Nể"],
      ["Danh", "Trấn", "Càn", "Khôn"],
      ["Thư", "Trấn", "Giang", "Hồ"],
    ],
  },
  {
    id: "hu-khong-sinh-huu",
    columns: [
      ["Hư", "Không", "Sinh", "Hữu"],
      ["Hữu", "Trung", "Sinh", "Vô"],
      ["Sắc", "Tức", "Thị", "Không"],
      ["Không", "Tức", "Thị", "Sắc"],
      ["Ngộ", "Đắc", "Chân", "Không"],
      ["Phương", "Độc", "Thiên", "Thư"],
    ],
  },
  {
    id: "tam-hoa-tu-dinh",
    columns: [
      ["Tam", "Hoa", "Tụ", "Đỉnh"],
      ["Ngũ", "Khí", "Triều", "Nguyên"],
      ["Kim", "Đan", "Đại", "Thành"],
      ["Nguyên", "Anh", "Xuất", "Khiếu"],
      ["Hóa", "Thần", "Hợp", "Đạo"],
      ["Linh", "Quyển", "Chứng", "Quả"],
    ],
  },
  {
    id: "van-co-truong-thanh",
    columns: [
      ["Vạn", "Cổ", "Trường", "Thành"],
      ["Thiên", "Nhai", "Hải", "Giác"],
      ["Cô", "Yên", "Trực", "Thượng"],
      ["Lạc", "Nhật", "Viên", "Sơn"],
      ["Độc", "Hành", "Thiên", "Hạ"],
      ["Độc", "Đọc", "Linh", "Thư"],
    ],
  },
  {
    id: "tinh-quan-dao-dia",
    columns: [
      ["Tinh", "Quân", "Đảo", "Địa"],
      ["Hà", "Hán", "Tây", "Lưu"],
      ["Thiên", "Môn", "Khai", "Hợp"],
      ["Địa", "Phủ", "Trầm", "Phù"],
      ["Nhân", "Gian", "Nhất", "Niệm"],
      ["Động", "Chuyển", "Càn", "Khôn"],
    ],
  },
  {
    id: "dao-huu-thien-nhai",
    columns: [
      ["Đạo", "Hữu", "Thiên", "Nhai"],
      ["Tương", "Phùng", "Hà", "Tiện"],
      ["Đối", "Tửu", "Luận", "Đạo"],
      ["Kiếm", "Khí", "Giao", "Minh"],
      ["Biệt", "Hậu", "Tương", "Tư"],
      ["Tái", "Ngộ", "Quyển", "Trung"],
    ],
  },
  {
    id: "linh-quyen-dai-thu",
    columns: [
      ["Linh", "Quyển", "Đại", "Thư"],
      ["Thiên", "Địa", "Huyền", "Hoàng"],
      ["Vũ", "Trụ", "Hồng", "Hoang"],
      ["Nhật", "Nguyệt", "Doanh", "Hư"],
      ["Thần", "Ma", "Giao", "Chiến"],
      ["Khai", "Quyển", "Tu", "Tiên"],
    ],
  },
] as const;

const LAST_POEM_KEY = "xi-poetry:last-id";

export function getDefaultPoem(): XianxiaPoem {
  return XIANXIA_POEMS[0];
}

export function pickRandomPoem(excludeId?: string | null): XianxiaPoem {
  const pool =
    excludeId && XIANXIA_POEMS.length > 1
      ? XIANXIA_POEMS.filter((poem) => poem.id !== excludeId)
      : XIANXIA_POEMS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? XIANXIA_POEMS[0];
}

export function readLastPoemId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(LAST_POEM_KEY);
  } catch {
    return null;
  }
}

export function writeLastPoemId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LAST_POEM_KEY, id);
  } catch {
    // private mode / quota — ignore
  }
}
