/** Đạo pháp / skill UI copy — tiên hiệp tone. */

export const SKILL_PANEL_COPY = {
  title: "Đạo pháp tu tiên",
  subtitleGuest: "Tán tu chỉ quan chiến",
  castKicker: "Linh khí dịch chuyển",
  castError: "Không thi triển được đạo pháp.",
  cooldownSuffix: "hồi chiêu"
} as const;

/** Ngũ hành / linh tính gắn từng đạo pháp — hiển thị trên nút skill. */
export const SKILL_ELEMENT_LABEL: Record<string, string> = {
  wind_blade: "Phong",
  summon_rain: "Thủy",
  bean_soldiers: "Mộc",
  sword_flight: "Kim",
  lotus_domain: "Linh",
  celestial_rain: "Thiên",
  heaven_thunder: "Lôi",
  starfall: "Tinh",
  hoa_long: "Hỏa",
  van_kiem: "Kiếm",
  dao_hoa_tan: "Hoa",
  thien_dia_an: "Ấn"
};

export function formatSkillCastLabel(input: {
  skillName: string;
  username: string;
  realm?: string | null;
}) {
  const who = input.realm ? `${input.username} · ${input.realm}` : input.username;
  return `「${input.skillName}」 · ${who}`;
}
