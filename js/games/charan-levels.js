// Level definitions for Charanvidhi Master: 65 levels in 5 phases (same structure as the reference app).
// Difficulty was tuned with a greedy bot (see README), not with real players.
export const PHASE1_LEVELS = 16;
export const TOTAL_LEVELS = 65;
export const PHASES = [
  { n: 1, id: 'discover', from: 1, to: 16 },
  { n: 2, id: 'identify', from: 17, to: 32 },
  { n: 3, id: 'foot', from: 33, to: 48 },
  { n: 4, id: 'place', from: 49, to: 64 },
  { n: 5, id: 'master', from: 65, to: 65 },
];
export const phaseOf = (n) => PHASES.find((p) => n >= p.from && n <= p.to) || PHASES[0];
/** 0-based chihna index a level teaches/asks about (phases 1-4). Level 65 asks about all. */
export const chihnaFor = (n) => (n - 1) % 16;

/** @returns {{types:number, goalType:number, goalCount:number, moves:number, seed:number}} */
export function levelConfig(n) {
  if (n > PHASE1_LEVELS) {
    return { types: 7, goalType: (n - 1) % 7, goalCount: 34 + Math.floor((n - 17) / 16), moves: 44 + (n === TOTAL_LEVELS ? 2 : 0), seed: 1000 + n * 37 };
  }
  const types = n <= 5 ? 5 : n <= 14 ? 6 : 7;
  return {
    types,
    goalType: (n - 1) % types,
    goalCount: 18 + n,
    moves: 26 + Math.floor(n / 3) + (types === 7 ? 12 : 0),
    seed: 1000 + n * 37,
  };
}
