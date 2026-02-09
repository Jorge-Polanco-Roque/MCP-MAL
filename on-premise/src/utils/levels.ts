/** Calculate level from total XP. Shared between gamification and analytics. */
export function calculateLevel(xp: number): number {
  if (xp <= 500) return Math.max(1, Math.ceil(xp / 100));
  if (xp <= 2000) return 5 + Math.ceil((xp - 500) / 300);
  if (xp <= 5000) return 10 + Math.ceil((xp - 2000) / 600);
  if (xp <= 10000) return 15 + Math.ceil((xp - 5000) / 1000);
  return 20 + Math.ceil((xp - 10000) / 2000);
}
