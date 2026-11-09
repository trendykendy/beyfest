// Outright wagers (Phase 2d): who wins the tournament (the Hero of
// Gyrondor) and who wins each path. They open at the Respite and close at
// Begin the Paths, at fixed odds looked up from the player's overall standing
// (lib/outrightTable.ts, made by scripts/outright-odds.ts).
//
// Shared by the app and the odds simulator, so both rank players and decide
// path winners the same way. It works on the engine's bracket definitions
// (STRUCTURES): a match's own slots are cleared once its players are known.

import { STRUCTURES, type StructureSpec } from "@beyfest/engine";

export type OutrightMarket = "champion" | "gilded" | "iron" | "ashen";
export const OUTRIGHT_MARKETS: readonly OutrightMarket[] = ["champion", "gilded", "iron", "ashen"];
export type Path = Exclude<OutrightMarket, "champion">;
export const PATHS: readonly Path[] = ["gilded", "iron", "ashen"];

// Which stages make up each path. With 8 players the upper bracket is shown
// as the Upper Path (market "gilded") and the lower one as the Lower Path
// ("ashen"); there's no Iron Path.
const PATH_STAGES: Record<Path, { ko: string[]; rr: string | null }> = {
  gilded: { ko: ["wb", "ub"], rr: "wb_rr" },
  iron: { ko: ["mb"], rr: null },
  ashen: { ko: ["lb"], rr: "lb_rr" },
};
const PATH_INDEX: Record<string, number> = { wb: 0, wb_rr: 0, ub: 0, mb: 1, lb: 2, lb_rr: 2, gf: 0 };
// Where a match's winner can go, best first.
const DEST_ORDER: Record<string, number> = { gf: 0, wb: 1, wb_rr: 1, ub: 1, mb: 2, lb: 3, lb_rr: 3 };

type SlotLike = { k: string; group?: number; rank?: number; match?: string; pool?: string } | null;

// The bracket for a tournament, from the number of players in it (a
// tournament's structure key is its player count).
export function structureFor(playerCount: number): StructureSpec | null {
  return STRUCTURES[playerCount] ?? null;
}

// The players in a tournament, counted from its group matches (everyone
// plays in the group stage).
export function playerCountOf(matches: { stage: string; p1: string | null; p2: string | null }[]): number {
  const ids = new Set<string>();
  for (const m of matches) {
    if (m.stage !== "group") continue;
    if (m.p1) ids.add(m.p1);
    if (m.p2) ids.add(m.p2);
  }
  return ids.size;
}

export function hasPath(st: StructureSpec, path: Path): boolean {
  const s = PATH_STAGES[path];
  return st.matches.some((d) => s.ko.includes(d.stage) || d.stage === s.rr);
}

// Which path a circle place first enters: 0 Gilded (and the 8-player upper
// bracket), 1 Iron, 2 Ashen.
export function entryPath(st: StructureSpec, group: number, rank: number): number {
  const isMe = (s: SlotLike) => !!s && s.k === "groupRank" && s.group === group && s.rank === rank;
  for (const d of st.matches) if (isMe(d.slot1 as SlotLike) || isMe(d.slot2 as SlotLike)) return PATH_INDEX[d.stage] ?? 0;
  for (const pool of st.pools) {
    if (!pool.members.some((m) => isMe(m as SlotLike))) continue;
    const d = st.matches.find((x) => (x.slot1 as SlotLike)?.pool === pool.pool || (x.slot2 as SlotLike)?.pool === pool.pool);
    if (d) return PATH_INDEX[d.stage] ?? 0;
  }
  return 0; // 8 players: everyone starts in the upper bracket
}

// One player's group-stage record, for ranking.
export type StandingInput = {
  playerId: string;
  group: number;
  place: number; // 1-based place in their circle
  wins: number;
  losses: number;
  pointDiff: number;
  pointsFor: number;
};

// The overall standing when outrights open, best first: the path a place
// leads to (Gilded, Iron, Ashen), then circle place, then win rate, then
// points difference and points scored per match. It's the engine's 8-player
// seeding, made fair across circles of different sizes.
export function overallStanding(st: StructureSpec, rows: StandingInput[]): string[] {
  const played = (r: StandingInput) => Math.max(1, r.wins + r.losses);
  const path = new Map(rows.map((r) => [r.playerId, entryPath(st, r.group, r.place)]));
  return [...rows]
    .sort(
      (a, b) =>
        path.get(a.playerId)! - path.get(b.playerId)! ||
        a.place - b.place ||
        b.wins / played(b) - a.wins / played(a) ||
        b.pointDiff / played(b) - a.pointDiff / played(a) ||
        b.pointsFor / played(b) - a.pointsFor / played(a) ||
        a.playerId.localeCompare(b.playerId),
    )
    .map((r) => r.playerId);
}

// The match whose winner leaves a path for the furthest stage (the grand
// final first, then a higher path). Not simply its last match: 10 players'
// Gilded Path ends with the semi-final losers' playoff, after the WB Final.
// null when the path has no knockout exit (a mini round-robin decides it).
export function pathExit(st: StructureSpec, path: Path): string | null {
  const inPath = (stage: string) => PATH_STAGES[path].ko.includes(stage);
  let best: { code: string; dest: number } | null = null;
  for (const d of st.matches) {
    for (const slot of [d.slot1, d.slot2] as SlotLike[]) {
      if (slot?.k !== "winner" || !slot.match) continue;
      const from = st.matches.find((x) => x.code === slot.match);
      if (!from || !inPath(from.stage) || inPath(d.stage)) continue;
      const dest = DEST_ORDER[d.stage] ?? 9;
      if (!best || dest < best.dest) best = { code: from.code, dest };
    }
  }
  return best?.code ?? null;
}

// Who won a path, once it's decided: the winner of its exit match, else the
// top of its mini round-robin once every round-robin match is done.
//   rrTop(stage) → the round-robin's winner, or null while it's unfinished.
// undefined: not decided yet. null: no such path.
export function pathWinner(
  st: StructureSpec,
  path: Path,
  matches: { code: string; winner: string | null }[],
  rrTop: (stage: string) => string | null,
): string | null | undefined {
  if (!hasPath(st, path)) return null;
  const exit = pathExit(st, path);
  if (exit) return matches.find((m) => m.code === exit)?.winner || undefined;
  const rr = PATH_STAGES[path].rr;
  return (rr && rrTop(rr)) || undefined;
}
