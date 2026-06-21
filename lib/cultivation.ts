import type { ReadingHistoryItem } from "@/lib/reading-history";
import {
  DEFAULT_WORDS_PER_CHAPTER,
  estimateReadingMinutes
} from "@/lib/reading-estimate";
import { streakBonusXp } from "@/lib/reading-streak";

export type CultivationAuraTier = "none" | "glow" | "rainbow" | "transcendent";
export type CommentPrestigeTier = "normal" | "adept" | "master" | "grandmaster";

export type CultivationProfile = {
  level: number;
  realm: string;
  realmStage: number;
  realmImageKey: string;
};

export type CultivationState = {
  identityLabel: "Tán tu" | "Đạo hữu";
  totalXp: number;
  readingXp: number;
  streakXp: number;
  currentStreak: number;
  level: number;
  realm: string;
  realmStage: number;
  realmImageKey: string;
  auraTier: CultivationAuraTier;
  xpIntoLevel: number;
  xpForLevel: number;
  progressPercent: number;
  chaptersToNextLevel: number;
  estimatedMinutesToNextLevel: number | null;
  completedChapterCount: number;
};

type Realm = {
  name: string;
  startsAtLevel: number;
  imageKey: string;
};

export const XP_PER_CHAPTER = 100;
const BASE_LEVEL_XP = 600;
const LEVEL_GROWTH = 1.6;

const REALMS: Realm[] = [
  { name: "Luyện Khí", startsAtLevel: 1, imageKey: "qi" },
  { name: "Trúc Cơ", startsAtLevel: 10, imageKey: "foundation" },
  { name: "Kim Đan", startsAtLevel: 20, imageKey: "core" },
  { name: "Nguyên Anh", startsAtLevel: 35, imageKey: "soul" },
  { name: "Hóa Thần", startsAtLevel: 55, imageKey: "spirit" },
  { name: "Luyện Hư", startsAtLevel: 80, imageKey: "void" },
  { name: "Hợp Thể", startsAtLevel: 110, imageKey: "union" },
  { name: "Đại Thừa", startsAtLevel: 150, imageKey: "ascension" }
];

export const MAX_CULTIVATION_LEVEL = REALMS[REALMS.length - 1].startsAtLevel;

export function effectiveCultivationLevel(level: number, isAdmin = false) {
  return isAdmin ? MAX_CULTIVATION_LEVEL : level;
}

export function maxCultivationProfile(): CultivationProfile {
  return resolveRealm(MAX_CULTIVATION_LEVEL);
}

export function cultivationProfileForAuthor(totalXp: number, isAdmin = false): CultivationProfile {
  if (isAdmin) return maxCultivationProfile();
  return cultivationFromTotalXp(totalXp);
}

export function xpRequiredForLevel(level: number) {
  return Math.floor(BASE_LEVEL_XP * Math.pow(level, LEVEL_GROWTH));
}

export function resolveRealm(level: number): CultivationProfile {
  const realm = [...REALMS].reverse().find((item) => level >= item.startsAtLevel) ?? REALMS[0];
  return {
    level,
    realm: realm.name,
    realmStage: level - realm.startsAtLevel + 1,
    realmImageKey: realm.imageKey
  };
}

export function cultivationAuraTier(level: number): CultivationAuraTier {
  if (level >= 110) return "transcendent";
  if (level >= 80) return "rainbow";
  if (level >= 55) return "glow";
  return "none";
}

export function commentPrestigeTier(level: number): CommentPrestigeTier {
  if (level >= 110) return "grandmaster";
  if (level >= 80) return "master";
  if (level >= 55) return "adept";
  return "normal";
}

export function commentPrestigeLabel(tier: CommentPrestigeTier) {
  if (tier === "grandmaster") return "Tiên nhân";
  if (tier === "master") return "Cao thủ";
  if (tier === "adept") return "Đạo hữu";
  return "";
}

export function commentAuraVars(level: number): Record<string, string> {
  const glow = Math.min(0.52, 0.08 + level * 0.014);
  const speed = Math.max(3.2, 9.5 - level * 0.2);
  return {
    "--comment-glow": glow.toFixed(2),
    "--comment-border-speed": `${speed.toFixed(1)}s`
  };
}

export function cultivationFromTotalXp(totalXp: number): CultivationProfile {
  const level = getCultivationLevelFromXp(totalXp);
  return resolveRealm(level);
}

export function getCultivationLevelFromXp(totalXp: number) {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);
  while (remainingXp >= xpRequiredForLevel(level)) {
    remainingXp -= xpRequiredForLevel(level);
    level += 1;
  }
  return level;
}

function estimateWordsToNextLevel(items: ReadingHistoryItem[], chaptersToNextLevel: number) {
  const sortedItems = [...items].sort((a, b) => Date.parse(b.lastReadAt) - Date.parse(a.lastReadAt));
  const wordCounts: number[] = [];

  for (const item of sortedItems) {
    const nextCounts = item.nextChapterWordCounts ?? [];
    for (const count of nextCounts) {
      if (wordCounts.length >= chaptersToNextLevel) break;
      if (count > 0) wordCounts.push(count);
    }
    if (wordCounts.length >= chaptersToNextLevel) break;
  }

  const observedAverage = wordCounts.length > 0
    ? Math.round(wordCounts.reduce((sum, count) => sum + count, 0) / wordCounts.length)
    : DEFAULT_WORDS_PER_CHAPTER;

  while (wordCounts.length < chaptersToNextLevel) {
    wordCounts.push(observedAverage);
  }

  return wordCounts.reduce((sum, count) => sum + count, 0);
}

export function getCultivationState(
  items: ReadingHistoryItem[],
  isLoggedIn: boolean,
  currentStreak = 0,
  isAdmin = false
): CultivationState {
  const completedChapterCount = items.reduce((sum, item) => sum + Math.max(0, item.maxReadChapterNumber), 0);
  const currentChapterPartial = items.reduce((sum, item) => {
    const partial = item.progressPercent >= 80 ? 0 : Math.max(0, Math.min(79, item.progressPercent));
    return sum + partial;
  }, 0);
  const readingXp = Math.round(completedChapterCount * XP_PER_CHAPTER + currentChapterPartial);
  const streakXp = streakBonusXp(currentStreak);
  const totalXp = readingXp + streakXp;

  const level = getCultivationLevelFromXp(totalXp);
  let remainingXp = totalXp;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    remainingXp -= xpRequiredForLevel(currentLevel);
  }

  const xpForLevel = xpRequiredForLevel(level);
  const chaptersToNextLevel = Math.max(1, Math.ceil((xpForLevel - remainingXp) / XP_PER_CHAPTER));
  const estimatedWordCountToNextLevel = estimateWordsToNextLevel(items, chaptersToNextLevel);
  const estimatedMinutesToNextLevel = estimateReadingMinutes(estimatedWordCountToNextLevel);

  const realmProfile = resolveRealm(level);
  const displayLevel = effectiveCultivationLevel(level, isAdmin);
  const displayProfile = isAdmin ? maxCultivationProfile() : realmProfile;
  const displayXpForLevel = isAdmin ? xpRequiredForLevel(MAX_CULTIVATION_LEVEL) : xpForLevel;

  return {
    identityLabel: isLoggedIn ? "Đạo hữu" : "Tán tu",
    totalXp,
    readingXp,
    streakXp,
    currentStreak,
    level: displayLevel,
    realm: displayProfile.realm,
    realmStage: displayProfile.realmStage,
    realmImageKey: displayProfile.realmImageKey,
    auraTier: cultivationAuraTier(displayLevel),
    xpIntoLevel: isAdmin ? displayXpForLevel : remainingXp,
    xpForLevel: displayXpForLevel,
    progressPercent: isAdmin ? 100 : Math.min(100, Math.max(0, (remainingXp / xpForLevel) * 100)),
    chaptersToNextLevel: isAdmin ? 0 : chaptersToNextLevel,
    estimatedMinutesToNextLevel: isAdmin ? null : estimatedMinutesToNextLevel,
    completedChapterCount
  };
}
