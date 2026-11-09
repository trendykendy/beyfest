// Measures, from a past event's results, the two numbers the wager odds
// assume, and prints what to change:
//   1. how often each finish happens   → FINISH_PRIOR in web/src/lib/odds.ts
//   2. how predictable matches are     → --spread for scripts/outright-odds.ts
//
// Run it against a COPY of the event's pb_data, never the original:
//   1. Copy pb_data off the event machine, e.g. to C:\beyfest-2026-data
//   2. Make a login for it:
//        pb/pocketbase.exe superuser upsert calib@local calibpass123 --dir=C:\beyfest-2026-data
//   3. Serve it on a spare port, with an empty migrations folder so nothing
//      in it changes (any empty folder will do):
//        pb/pocketbase.exe serve --http=127.0.0.1:8095 --dir=C:\beyfest-2026-data --migrationsDir=C:\empty
//   4. In another terminal (from tournament-app):
//        PB_URL=http://127.0.0.1:8095 PB_EMAIL=calib@local PB_PASSWORD=calibpass123 bun run scripts/calibrate.ts
//      or in PowerShell:
//        $env:PB_URL="http://127.0.0.1:8095"; $env:PB_EMAIL="calib@local"; $env:PB_PASSWORD="calibpass123"; bun run scripts/calibrate.ts
//      Add --tournament <id> to use one tournament only (it lists them):
//      pick the real event, not rehearsals or test runs.
//   5. Do what it prints: set FINISH_PRIOR, and re-run scripts/outright-odds.ts
//      with the spread it found (about 10 minutes). Then run the tests.
//
// Checked: on a test tournament of pure coin-flip results it finds spread 0.
//
// The dev database works too (defaults below), for trying it out.

import PocketBase from "pocketbase";
import { STRUCTURES, applyResult, createGroupStage, generateKnockout, makeRng, resolve, type State } from "../engine/src/index.ts";

const url = process.env.PB_URL || "http://127.0.0.1:8090";
const email = process.env.PB_EMAIL || "admin@beyfest.local";
const password = process.env.PB_PASSWORD || "beyfestadmin2026";
const only = (() => {
  const i = process.argv.indexOf("--tournament");
  return i > 0 ? process.argv[i + 1] : "";
})();

const pb = new PocketBase(url);
await pb.collection("_superusers").authWithPassword(email, password);

const PTS: Record<string, number> = { spin: 1, knockout: 2, dominant: 3 };
type Round = { who: 1 | 2; finish: string };

const tournaments = await pb.collection("tournaments").getFullList({ sort: "createdAt" });
console.log(`Tournaments in ${url}:`);
for (const t of tournaments) console.log(`  ${t.id}  ${t.name}  (${String(t.createdAt).slice(0, 10)}, ${t.playerCount} players)`);
const chosen = tournaments.filter((t) => !only || t.id === only);
if (!chosen.length) throw new Error(`No tournament ${only}`);

// ── 1. Finish frequencies, from round logs that add up to the result ──
const counts: Record<string, number> = { spin: 0, knockout: 0, dominant: 0 };
let logged = 0;
// ── 2. Match results, per tournament, for the strength fit ──
const results: { t: string; winner: string; loser: string }[] = [];

for (const t of chosen) {
  const matches = await pb.collection("matches").getFullList({ filter: pb.filter("tournament = {:t}", { t: t.id }) });
  for (const m of matches) {
    if (m.matchStatus !== "done" || m.walkover || !m.winner || !m.loser) continue;
    results.push({ t: t.id, winner: m.winner, loser: m.loser });
    const log: Round[] = Array.isArray(m.liveLog) ? m.liveLog : [];
    const pts = (who: 1 | 2) => log.filter((r) => r.who === who).reduce((a, r) => a + (PTS[r.finish] ?? 0), 0);
    if (!log.length || pts(1) !== m.p1Score || pts(2) !== m.p2Score) continue;
    logged++;
    for (const r of log) if (r.finish in counts) counts[r.finish]++;
  }
}

const rounds = counts.spin + counts.knockout + counts.dominant;
console.log(`\n1. Finish frequencies: ${rounds} rounds from ${logged} matches with a full round log`);
if (rounds) {
  const f = (k: string) => Math.round((counts[k] / rounds) * 100) / 100;
  console.log(`   spin ${pct(counts.spin / rounds)}, knockout ${pct(counts.knockout / rounds)}, dominant ${pct(counts.dominant / rounds)}`);
  console.log(`   → in web/src/lib/odds.ts set: FINISH_PRIOR = { spin: ${f("spin")}, knockout: ${f("knockout")}, dominant: ${f("dominant")} }`);
  if (rounds < 100) console.log(`   (only ${rounds} rounds: treat as rough)`);
}

// ── 2. How predictable matches are ─────────────────────────────────────
// Fit each player a strength from their match results (Bradley–Terry: the
// stronger wins with chance 1 / (1 + e^-(gap)), the same model as the
// simulator), with a gentle pull towards 0. One event is only ~7 matches a
// player, so luck looks like skill and the fitted spread runs HIGH (random
// results still fit to ~0.7). So the fitted spread isn't used directly: the
// same fit is run on simulated events of the same size at known spreads, and
// the spread whose fits match the real one is the answer.
type Result = { t: string; winner: string; loser: string };

function fittedSpread(rs: Result[], steps = 1500): number {
  const ids = [...new Set(rs.flatMap((r) => [`${r.t}:${r.winner}`, `${r.t}:${r.loser}`]))];
  const s = new Map(ids.map((id) => [id, 0]));
  const PRIOR_SD = 1.5;
  for (let step = 0; step < steps; step++) {
    const grad = new Map(ids.map((id) => [id, -s.get(id)! / PRIOR_SD ** 2]));
    for (const r of rs) {
      const w = `${r.t}:${r.winner}`;
      const l = `${r.t}:${r.loser}`;
      const p = 1 / (1 + Math.exp(-(s.get(w)! - s.get(l)!)));
      grad.set(w, grad.get(w)! + (1 - p));
      grad.set(l, grad.get(l)! - (1 - p));
    }
    for (const id of ids) s.set(id, s.get(id)! + 0.05 * grad.get(id)!);
  }
  const vals = [...s.values()];
  const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  return Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, vals.length - 1));
}

// One simulated event shaped like the real ones (same player counts), at a
// given true spread: its match results.
const rng = makeRng(7);
function simulatedResults(spread: number): Result[] {
  const out: Result[] = [];
  for (const t of chosen) {
    const n = Number(t.playerCount);
    if (!STRUCTURES[n]) continue;
    const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const skill = new Map(players.map((p) => [p.id, gauss() * spread]));
    const stage = createGroupStage(players, rng);
    const state: State = { structure: stage.structure, players: stage.players, matches: stage.matches };
    const play = (code: string) => {
      const m = state.matches.find((x) => x.code === code)!;
      const p1Wins = rng() < 1 / (1 + Math.exp(-(skill.get(m.p1!)! - skill.get(m.p2!)!)));
      applyResult(state, code, p1Wins ? 5 : 2, p1Wins ? 2 : 5);
      out.push({ t: t.id, winner: p1Wins ? m.p1! : m.p2!, loser: p1Wins ? m.p2! : m.p1! });
    };
    for (const gm of state.matches.filter((m) => m.stage === "group")) play(gm.code);
    resolve(state);
    generateKnockout(state, rng);
    for (let g = 0; g < 300; g++) {
      const next = state.matches.find((m) => m.stage !== "group" && m.status === "ready");
      if (!next) break;
      play(next.code);
    }
  }
  return out;
}
function gauss() {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

console.log(`\n2. Predictability: ${results.length} results`);
if (results.length) {
  const observed = fittedSpread(results);
  console.log(`   fitted spread from the results: ${observed.toFixed(2)} (luck inflates this; matching it to simulations…)`);
  const SIMS = 40;
  let best = { spread: 0, gap: Infinity };
  for (let sp = 0; sp <= 2.001; sp += 0.1) {
    let total = 0;
    for (let i = 0; i < SIMS; i++) total += fittedSpread(simulatedResults(sp));
    const gap = Math.abs(total / SIMS - observed);
    if (gap < best.gap) best = { spread: Math.round(sp * 10) / 10, gap };
  }
  console.log(`   true spread that fits: ${best.spread} (the current table assumes ${await currentSpread()})`);
  console.log(`   → regenerate the outright table: bun run scripts/outright-odds.ts --runs 20000 --spread ${best.spread}`);
  console.log(`   (one event is a small sample: treat it as a good guess, not a measurement)`);
}

function pct(x: number) {
  return `${Math.round(x * 1000) / 10}%`;
}
async function currentSpread() {
  try {
    return (await import("../web/src/lib/outrightTable.ts")).OUTRIGHT_SPREAD;
  } catch {
    return "?";
  }
}
