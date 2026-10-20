export function getNewLevel(previousXp, nextXp) {
  if (previousXp === null || !Number.isFinite(previousXp) || !Number.isFinite(nextXp)) return null;
  if (nextXp <= previousXp) return null;
  const previousLevel = Math.floor(previousXp / 100) + 1;
  const nextLevel = Math.floor(nextXp / 100) + 1;
  return nextLevel > previousLevel ? nextLevel : null;
}
