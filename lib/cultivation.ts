import type { ReadingHistoryItem } from "@/lib/reading-history";
import {
  DEFAULT_WORDS_PER_CHAPTER,
  estimateReadingMinutes
} from "@/lib/reading-estimate";

export type CultivationState = {
  identityLabel: "Tán tu" | "Đạo hữu";
  totalXp: number;
  level: number;
  realm: string;
  realmStage: number;
  realmImageKey: string;
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

export function xpRequiredForLevel(level: number) {
  return Math.floor(BASE_LEVEL_XP * Math.pow(level, LEVEL_GROWTH));
}

export function resolveRealm(level: number) {
  const realm = [...REALMS].reverse().find((item) => level >= item.startsAtLevel) ?? REALMS[0];
  return {
    realm: realm.name,
    realmStage: level - realm.startsAtLevel + 1,
    realmImageKey: realm.imageKey
  };
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

export function getCultivationState(items: ReadingHistoryItem[], isLoggedIn: boolean): CultivationState {
  const completedChapterCount = items.reduce((sum, item) => sum + Math.max(0, item.maxReadChapterNumber), 0);
  const currentChapterPartial = items.reduce((sum, item) => {
    const partial = item.progressPercent >= 80 ? 0 : Math.max(0, Math.min(79, item.progressPercent));
    return sum + partial;
  }, 0);
  const totalXp = Math.round(completedChapterCount * XP_PER_CHAPTER + currentChapterPartial);

  const level = getCultivationLevelFromXp(totalXp);
  let remainingXp = totalXp;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    remainingXp -= xpRequiredForLevel(currentLevel);
  }

  const xpForLevel = xpRequiredForLevel(level);
  const chaptersToNextLevel = Math.max(1, Math.ceil((xpForLevel - remainingXp) / XP_PER_CHAPTER));
  const estimatedWordCountToNextLevel = estimateWordsToNextLevel(items, chaptersToNextLevel);
  const estimatedMinutesToNextLevel = estimateReadingMinutes(estimatedWordCountToNextLevel);

  return {
    identityLabel: isLoggedIn ? "Đạo hữu" : "Tán tu",
    totalXp,
    level,
    ...resolveRealm(level),
    xpIntoLevel: remainingXp,
    xpForLevel,
    progressPercent: Math.min(100, Math.max(0, (remainingXp / xpForLevel) * 100)),
    chaptersToNextLevel,
    estimatedMinutesToNextLevel,
    completedChapterCount
  };
}
