// Level definitions for Charanvidhi Master, phase 1 ("Discover"): 16 levels, one new chihna each.
// Difficulty was tuned with a greedy bot (see README): early levels are easy, later ones need specials.
export const PHASE1_LEVELS = 16;

/** @returns {{types:number, goalType:number, goalCount:number, moves:number, seed:number}} */
export function levelConfig(n) {
  const types = n <= 5 ? 5 : n <= 14 ? 6 : 7;
  return {
    types,
    goalType: (n - 1) % types,
    goalCount: 18 + n,
    moves: 26 + Math.floor(n / 3) + (types === 7 ? 12 : 0),
    seed: 1000 + n * 37,
  };
}
