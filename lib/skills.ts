export type SkillScope = "chapter" | "story";

export type ReaderSkill = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  minLevel: number;
  cooldownSeconds: number;
  adminCooldownSeconds?: number;
  adminOnly?: boolean;
  adminDurationMs?: number;
  adminIntensity?: number;
  durationMs: number;
  intensity: number;
  scope: SkillScope;
  icon: "leaf" | "rain" | "soldiers" | "sword" | "thunder" | "sparkles" | "shield" | "flame";
};

export const READER_SKILLS: ReaderSkill[] = [
  {
    id: "wind_blade",
    name: "Phong Nhận",
    shortName: "Phong",
    description: "Một đạo phong nhận lướt ngang chương.",
    minLevel: 2,
    cooldownSeconds: 45,
    durationMs: 5600,
    intensity: 1,
    scope: "chapter",
    icon: "leaf"
  },
  {
    id: "summon_rain",
    name: "Hoán Vũ",
    shortName: "Vũ",
    description: "Màn mưa linh khí, thủy ấn và gợn sóng phủ lên trang đọc.",
    minLevel: 5,
    cooldownSeconds: 90,
    adminCooldownSeconds: 6,
    adminDurationMs: 9200,
    adminIntensity: 4,
    durationMs: 7600,
    intensity: 2,
    scope: "chapter",
    icon: "rain"
  },
  {
    id: "bean_soldiers",
    name: "Rải Đậu Thành Binh",
    shortName: "Binh",
    description: "Triệu hồi binh nhỏ chạy ngang màn hình.",
    minLevel: 8,
    cooldownSeconds: 150,
    durationMs: 8200,
    intensity: 2,
    scope: "story",
    icon: "soldiers"
  },
  {
    id: "sword_flight",
    name: "Ngự Kiếm Phi Hành",
    shortName: "Kiếm",
    description: "Kiếm quang bay ngang tàng thư.",
    minLevel: 12,
    cooldownSeconds: 210,
    durationMs: 6400,
    intensity: 3,
    scope: "story",
    icon: "sword"
  },
  {
    id: "lotus_domain",
    name: "Liên Hoa Kết Giới",
    shortName: "Liên",
    description: "Mở kết giới sen, sóng nước và cánh hoa xoay quanh trang.",
    minLevel: 14,
    cooldownSeconds: 240,
    durationMs: 7800,
    intensity: 3,
    scope: "chapter",
    icon: "shield"
  },
  {
    id: "celestial_rain",
    name: "Thiên Hà Vũ Lệnh",
    shortName: "Thiên Vũ",
    description: "Admin pháp: mở thiên hà mưa sao, thủy long và đại trận mưa phủ chương.",
    minLevel: 1,
    cooldownSeconds: 12,
    adminCooldownSeconds: 3,
    adminOnly: true,
    durationMs: 9800,
    intensity: 5,
    scope: "story",
    icon: "rain"
  },
  {
    id: "heaven_thunder",
    name: "Thiên Lôi Dẫn",
    shortName: "Lôi",
    description: "Một tia thiên lôi lóe sáng trong chớp mắt.",
    minLevel: 18,
    cooldownSeconds: 300,
    durationMs: 4600,
    intensity: 3,
    scope: "chapter",
    icon: "thunder"
  },
  {
    id: "starfall",
    name: "Tinh Vẫn",
    shortName: "Tinh",
    description: "Triệu hồi mưa sao băng rơi qua bầu trời chương.",
    minLevel: 22,
    cooldownSeconds: 360,
    durationMs: 7000,
    intensity: 4,
    scope: "story",
    icon: "sparkles"
  },
  {
    id: "hoa_long",
    name: "Hỏa Long Kiếp",
    shortName: "Hỏa Long",
    description: "Triệu hồi hỏa long cuộn qua trang đọc, thiêu đốt linh khí.",
    minLevel: 25,
    cooldownSeconds: 420,
    durationMs: 8200,
    intensity: 4,
    scope: "story",
    icon: "flame"
  },
  {
    id: "van_kiem",
    name: "Vạn Kiếm Quy Tông",
    shortName: "Vạn Kiếm",
    description: "Nghìn lưỡi kiếm từ thiên đàng rơi xuống, kiếm ý bao phủ chương.",
    minLevel: 30,
    cooldownSeconds: 480,
    durationMs: 7600,
    intensity: 4,
    scope: "chapter",
    icon: "sword"
  },
  {
    id: "dao_hoa_tan",
    name: "Đào Hoa Tán",
    shortName: "Đào Hoa",
    description: "Vạn cánh đào hoa rơi rụng, tiên vũ phủ khắp tàng thư.",
    minLevel: 35,
    cooldownSeconds: 540,
    durationMs: 9000,
    intensity: 3,
    scope: "story",
    icon: "sparkles"
  },
  {
    id: "thien_dia_an",
    name: "Thiên Địa Đại Ấn",
    shortName: "Đại Ấn",
    description: "Admin pháp: phong ấn thiên địa, đại trận vàng kim xoay cuốn toàn màn hình.",
    minLevel: 1,
    cooldownSeconds: 8,
    adminCooldownSeconds: 2,
    adminOnly: true,
    adminDurationMs: 13000,
    adminIntensity: 5,
    durationMs: 11000,
    intensity: 5,
    scope: "story",
    icon: "shield"
  }
];

export function getSkill(skillId: string) {
  return READER_SKILLS.find((skill) => skill.id === skillId) ?? null;
}

export function visibleSkillsForAdmin(isAdmin: boolean) {
  return READER_SKILLS.filter((skill) => isAdmin || !skill.adminOnly);
}

export function effectiveSkillCooldownSeconds(skill: ReaderSkill, isAdmin: boolean) {
  if (!isAdmin) return skill.cooldownSeconds;
  return skill.adminCooldownSeconds ?? Math.max(3, Math.min(10, Math.ceil(skill.cooldownSeconds * 0.08)));
}

export function effectiveSkillDurationMs(skill: ReaderSkill, isAdmin: boolean) {
  if (!isAdmin) return skill.durationMs;
  return skill.adminDurationMs ?? Math.min(11000, Math.round(skill.durationMs * 1.18));
}

export function effectiveSkillIntensity(skill: ReaderSkill, isAdmin: boolean) {
  if (!isAdmin) return skill.intensity;
  return skill.adminIntensity ?? Math.min(5, skill.intensity + 1);
}
