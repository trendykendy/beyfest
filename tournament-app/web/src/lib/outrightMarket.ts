// Outright wagers in the app (Phase 2d): when they're open, their odds, how
// they settle, and their names. The ranking and path rules they share with
// the odds simulator are in lib/outrights.ts; the chances are in
// lib/outrightTable.ts (made by scripts/outright-odds.ts).

import { OUTRIGHT_CHANCES } from "./outrightTable";
import {
  OUTRIGHT_MARKETS,
  overallStanding,
  pathWinner,
  playerCountOf,
  structureFor,
  type OutrightMarket,
  type Path,
} from "./outrights";
import { STAGES, TITLES } from "./terms";
import { groupStandings, inRespite, miniRRStandings, type PBMatch, type PBPlayer } from "./view";

export const isOutright = (market: string): market is OutrightMarket => (OUTRIGHT_MARKETS as readonly string[]).includes(market);

// Open from the Respite (every group match done) until Begin the Paths
// generates the knockout.
export const outrightsOpen = (matches: PBMatch[]) => inRespite(matches);

// Odds from a chance: the same 5% house edge as match wagers, capped at ×50
// (approved 2026-11-09). null: they can't win it from there.
const OUTRIGHT_EDGE = 0.05;
const OUTRIGHT_CAP = 50;
export function outrightOddsFor(chance: number): number | null {
  if (!(chance > 0)) return null;
  const raw = 1 / (chance * (1 + OUTRIGHT_EDGE));
  return Math.round(Math.min(OUTRIGHT_CAP, Math.max(1.05, raw)) * 100) / 100;
}

// Everyone's overall standing at the Respite, best first (player ids).
export function respiteStanding(players: PBPlayer[], matches: PBMatch[]): string[] {
  const st = structureFor(players.length);
  if (!st) return [];
  const rows = st.groups.flatMap((_, g) =>
    groupStandings(players, matches, g).map((r, i) => ({ ...r, group: g, place: i + 1 })),
  );
  return overallStanding(st, rows);
}

// Every outright's odds for every player, by player id (null: not offered).
export function outrightBook(players: PBPlayer[], matches: PBMatch[]): Record<OutrightMarket, Map<string, number | null>> {
  const chances = OUTRIGHT_CHANCES[players.length];
  const standing = respiteStanding(players, matches);
  const book = {} as Record<OutrightMarket, Map<string, number | null>>;
  for (const k of OUTRIGHT_MARKETS) {
    book[k] = new Map(standing.map((id, i) => [id, chances ? outrightOddsFor(chances[k][i] ?? 0) : null]));
  }
  return book;
}

// The odds an outright would get right now, or why it can't be placed.
// Shared by the phone and the server, like quoteWager.
export function quoteOutright(market: string, playerId: string, players: PBPlayer[], matches: PBMatch[]): { odds: number } | { error: string } {
  if (!isOutright(market)) return { error: "Unknown wager." };
  if (!outrightsOpen(matches)) return { error: "Outright wagers are open during the Respite only." };
  if (!players.some((p) => p.id === playerId)) return { error: "Pick one of the bladers." };
  const odds = outrightBook(players, matches)[market].get(playerId) ?? null;
  return odds === null ? { error: "They can't win that from where they finished." } : { odds };
}

// How an outright stands, from the matches: open until its winner is known.
export function outrightState(market: OutrightMarket, pick: string, matches: PBMatch[]): "open" | "won" | "lost" | "refund" {
  if (market === "champion") {
    const gf = matches.find((m) => m.stage === "gf");
    if (!gf || gf.matchStatus !== "done") return "open";
    return gf.winner === pick ? "won" : "lost";
  }
  const st = structureFor(playerCountOf(matches));
  if (!st) return "refund";
  const rrTop = (stage: string) => {
    const rr = matches.filter((m) => m.stage === stage);
    if (!rr.length || rr.some((m) => m.matchStatus !== "done")) return null;
    return miniRRStandings(matches, stage as "wb_rr" | "lb_rr")[0]?.playerId ?? null;
  };
  const w = pathWinner(st, market as Path, matches, rrTop);
  if (w === null) return "refund"; // no such path in this bracket
  if (w === undefined) return "open";
  return w === pick ? "won" : "lost";
}

// What each outright is called. 8 players have an Upper and a Lower bracket
// instead of three paths.
export function outrightName(market: OutrightMarket, playerCount: number): string {
  if (market === "champion") return TITLES.champion;
  if (playerCount === 8) return market === "gilded" ? "Upper Path" : "Lower Path";
  return { gilded: STAGES.winners, iron: STAGES.mid, ashen: STAGES.losers }[market];
}

// The outrights this bracket has (no Iron Path with 8 players).
export function outrightMarketsFor(playerCount: number): OutrightMarket[] {
  const chances = OUTRIGHT_CHANCES[playerCount];
  return OUTRIGHT_MARKETS.filter((k) => chances?.[k]?.some((c) => c > 0));
}
