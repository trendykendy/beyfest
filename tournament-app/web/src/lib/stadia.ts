// The Tetrafatalis arenas ("stadia" in the code and database). Every round of
// every match is played in one, drawn just before the round starts, together
// with which player stands on the north side. Keys are what's stored; the
// numeral, name and nickname are what screens show.
export interface Stadium {
  key: string;
  num: string; // I / II / III / IV
  name: string; // short name that fits the TV at display size
  code: string; // nickname
  gem: string; // its gem's colour in Casting the Runes (decided 2026-11-09)
}

// The first three are the Triple Threat stadia. The fourth is a placeholder
// until it's chosen: rename it here (key included is fine while the data is
// only test data). The organiser can take it out of the draw from the scorer.
export const STADIA: Stadium[] = [
  { key: "xtreme", num: "I", name: "Xtreme Battle", code: "The Neutral Ground", gem: "#f0c25a" },
  { key: "motor", num: "II", name: "Double Xtreme", code: "The Crusher", gem: "#3fcf8a" },
  { key: "drop", num: "III", name: "Drop Attack", code: "Death From Above", gem: "#ff7a3a" },
  { key: "fourth", num: "IV", name: "Fourth Arena", code: "To be chosen", gem: "#a070ff" },
];

const BY_KEY = new Map(STADIA.map((s) => [s.key, s]));
export const stadiumOf = (key: string | undefined | null): Stadium | null => (key ? BY_KEY.get(key) ?? null : null);
export const isStadiumKey = (key: unknown): key is string => typeof key === "string" && BY_KEY.has(key);

// Weighted draw, so the event ends up with an even split without being
// predictable. A stadium's weight is (1 + how many draws it is behind the
// most-used one)²: equal counts are a fair 1 in 4, and a stadium one draw
// behind is 4× as likely as the leader.
//   counts — draws so far, by key (missing = 0)
//   off    — stadia taken out of the draw (e.g. a flat motor)
//   avoid  — the stadium being redrawn, so a redraw never repeats it
// If that leaves nothing, `avoid` is ignored, then `off`: there's always a stadium.
export function pickStadium(
  counts: Record<string, number>,
  { off = [], avoid = "", random = Math.random }: { off?: string[]; avoid?: string; random?: () => number } = {},
): string {
  const keys = STADIA.map((s) => s.key);
  let pool = keys.filter((k) => !off.includes(k) && k !== avoid);
  if (pool.length === 0) pool = keys.filter((k) => !off.includes(k));
  if (pool.length === 0) pool = keys;

  const max = Math.max(...pool.map((k) => counts[k] ?? 0));
  const weights = pool.map((k) => (1 + max - (counts[k] ?? 0)) ** 2);
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// ── Sides ──────────────────────────────────────────────────────────────
// Which player (1 or 2, the match's p1/p2) stands on the north side of the
// arena for a round. A fair coin, drawn with the arena each round; the other
// player is south. 0 means not drawn.
export type North = 0 | 1 | 2;
export const pickNorth = (random: () => number = Math.random): 1 | 2 => (random() < 0.5 ? 1 : 2);
export const isNorth = (v: unknown): v is 1 | 2 => v === 1 || v === 2;
export const southOf = (north: 1 | 2): 1 | 2 => (north === 1 ? 2 : 1);

// Stamp each round with where it was played and who stood north. Rounds
// already saved keep what they had; a new round was played in the match's
// current arena with its current sides. (The scorer doesn't send places.)
export function withPlaces<R extends { stadium?: string; north?: 1 | 2 }>(
  rounds: R[],
  saved: { stadium?: string; north?: unknown }[],
  current: { stadium: string; north: unknown },
): R[] {
  rounds.forEach((r, i) => {
    const from = i < saved.length ? saved[i] : current;
    if (isStadiumKey(from.stadium)) r.stadium = from.stadium;
    if (isNorth(from.north)) r.north = from.north;
  });
  return rounds;
}
