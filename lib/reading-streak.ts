export type ReadingStreakSnapshot = {
  currentStreak: number;
  bestStreak: number;
  lastReadDate: string | null;
};

function uniqueSortedDates(dates: string[]) {
  return [...new Set(dates.filter(Boolean))].sort((a, b) => b.localeCompare(a));
}

function previousDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return previous.toISOString().slice(0, 10);
}

export function computeStreakFromReadDates(dates: string[]): ReadingStreakSnapshot {
  const sorted = uniqueSortedDates(dates);
  if (sorted.length === 0) {
    return { currentStreak: 0, bestStreak: 0, lastReadDate: null };
  }

  let currentStreak = 1;
  let bestStreak = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const expectedPrevious = previousDateString(sorted[index - 1]);
    if (sorted[index] === expectedPrevious) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  let rolling = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const expectedPrevious = previousDateString(sorted[index - 1]);
    rolling = sorted[index] === expectedPrevious ? rolling + 1 : 1;
    bestStreak = Math.max(bestStreak, rolling);
  }

  return {
    currentStreak,
    bestStreak,
    lastReadDate: sorted[0]
  };
}

export function streakBonusXp(currentStreak: number) {
  if (currentStreak <= 0) return 0;

  let bonus = currentStreak * 15;
  if (currentStreak >= 7) bonus += 100;
  if (currentStreak >= 30) bonus += 500;
  return bonus;
}
