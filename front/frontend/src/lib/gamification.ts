/**
 * Gamification utilities — mirrors server-side calculateLevel() from
 * on-premise/src/tools/gamification.ts
 */

// ─── Level calculation (must match server formula exactly) ───

export function calculateLevel(xp: number): number {
  if (xp <= 500) return Math.max(1, Math.ceil(xp / 100));
  if (xp <= 2000) return 5 + Math.ceil((xp - 500) / 300);
  if (xp <= 5000) return 10 + Math.ceil((xp - 2000) / 600);
  if (xp <= 10000) return 15 + Math.ceil((xp - 5000) / 1000);
  return 20 + Math.ceil((xp - 10000) / 2000);
}

// ─── XP thresholds for each level ───

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= 5) return (level - 1) * 100;
  if (level <= 10) return 500 + (level - 5) * 300;
  if (level <= 15) return 2000 + (level - 10) * 600;
  if (level <= 20) return 5000 + (level - 15) * 1000;
  return 10000 + (level - 20) * 2000;
}

export function xpForNextLevel(level: number): number {
  return xpForLevel(level + 1);
}

/**
 * Get XP progress within current level as a 0-1 fraction.
 */
export function levelProgress(xp: number): number {
  const level = calculateLevel(xp);
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForNextLevel(level);
  const range = nextThreshold - currentThreshold;
  if (range <= 0) return 1;
  return Math.min(1, (xp - currentThreshold) / range);
}

// ─── Level names ───

const LEVEL_NAMES: Record<number, string> = {
  1: "Apprentice",
  2: "Novice",
  3: "Initiate",
  4: "Contributor",
  5: "Builder",
  6: "Specialist",
  7: "Craftsman",
  8: "Expert",
  9: "Veteran",
  10: "Master",
  11: "Senior Master",
  12: "Elite",
  13: "Champion",
  14: "Legend",
  15: "Grandmaster",
  16: "Sage",
  17: "Luminary",
  18: "Visionary",
  19: "Titan",
  20: "Architect",
};

export function levelName(level: number): string {
  if (level >= 20) return "Architect";
  return LEVEL_NAMES[level] || `Level ${level}`;
}

// ─── Tier colors & styles ───

export const TIER_STYLES = {
  bronze: {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-300",
    icon: "\ud83e\udd49",
    label: "Bronze",
  },
  silver: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-400",
    icon: "\ud83e\udd48",
    label: "Silver",
  },
  gold: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-400",
    icon: "\ud83e\udd47",
    label: "Gold",
  },
  platinum: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-400",
    icon: "\ud83d\udc8e",
    label: "Platinum",
  },
} as const;

export type Tier = keyof typeof TIER_STYLES;

export function tierStyle(tier: string) {
  return TIER_STYLES[tier as Tier] || TIER_STYLES.bronze;
}

// ─── Achievement categories ───

export const CATEGORY_COLORS: Record<string, string> = {
  code: "bg-blue-100 text-blue-700",
  collaboration: "bg-green-100 text-green-700",
  agile: "bg-orange-100 text-orange-700",
  exploration: "bg-purple-100 text-purple-700",
  mastery: "bg-red-100 text-red-700",
};

// ─── Role badge colors ───

export const ROLE_COLORS: Record<string, string> = {
  developer: "bg-blue-100 text-blue-700",
  lead: "bg-purple-100 text-purple-700",
  scrum_master: "bg-green-100 text-green-700",
  product_owner: "bg-orange-100 text-orange-700",
};

// ─── Rank medals ───

export function rankMedal(rank: number): string {
  if (rank === 1) return "\ud83e\udd47";
  if (rank === 2) return "\ud83e\udd48";
  if (rank === 3) return "\ud83e\udd49";
  return `#${rank}`;
}
