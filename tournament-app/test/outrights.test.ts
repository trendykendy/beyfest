import { describe, expect, test } from "bun:test";
import {
  STRUCTURES,
  applyResult,
  createGroupStage,
  generateKnockout,
  makeRng,
  resolve,
  type State,
} from "../engine/src/index";
import { entryPath, overallStanding, pathExit, playerCountOf, type StandingInput } from "../web/src/lib/outrights";
import {
  outrightBook,
  outrightMarketsFor,
  outrightName,
  outrightOddsFor,
  outrightState,
  quoteOutright,
  respiteStanding,
} from "../web/src/lib/outrightMarket";
import { OUTRIGHT_CHANCES } from "../web/src/lib/outrightTable";
import { betState, type PBBet } from "../web/src/lib/betting";
import type { PBMatch, PBPlayer } from "../web/src/lib/view";

// A real tournament played through the engine, as the app sees it.
function tournament(n: number, seed: number, stage: "groups" | "knockout" | "done") {
  const rng = makeRng(seed);
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const g = createGroupStage(players, rng);
  const state: State = { structure: g.structure, players: g.players, matches: g.matches };
  // Lower id wins: a fixed, readable outcome.
  const play = (code: string) => {
    const m = state.matches.find((x) => x.code === code)!;
    const p1Wins = Number(m.p1!.slice(1)) < Number(m.p2!.slice(1));
    applyResult(state, code, p1Wins ? 5 : 2, p1Wins ? 2 : 5);
  };
  for (const m of state.matches.filter((x) => x.stage === "group")) play(m.code);
  resolve(state);
  if (stage !== "groups") {
    generateKnockout(state, rng);
    if (stage === "done") {
      for (let i = 0; i < 300; i++) {
        const next = state.matches.find((m) => m.stage !== "group" && m.status === "ready");
        if (!next) break;
        play(next.code);
      }
    }
  }
  const pbPlayers: PBPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    groupIndex: p.group,
    drawOrder: p.drawOrder,
    finalGroupRank: p.finalGroupRank,
    withdrawn: false,
  }));
  const pbMatches = state.matches.map(
    (m) =>
      ({
        ...m,
        id: m.code,
        groupIndex: m.group,
        p1: m.p1 ?? "",
        p2: m.p2 ?? "",
        winner: m.winner ?? "",
        loser: m.loser ?? "",
        matchStatus: m.status,
        liveP1: 0,
        liveP2: 0,
        liveLog: [],
        startedAt: "",
        walkover: false,
      }) as unknown as PBMatch,
  );
  return { players: pbPlayers, matches: pbMatches };
}
function outright(market: PBBet["market"], pick: string): PBBet {
  return { id: "o", bettor: "x", market, match: "", pick, selection: "", stake: 100, odds: 4, created: "2027-03-01T12:00:00Z" };
}

describe("the bracket rules", () => {
  test("a path's winner leaves it for the furthest stage, not its last match", () => {
    expect(pathExit(STRUCTURES[10], "gilded")).toBe("WBF"); // not the losers' playoff played after it
    expect(pathExit(STRUCTURES[8], "gilded")).toBe("UBF");
    expect(pathExit(STRUCTURES[8], "ashen")).toBe("LBF");
    expect(pathExit(STRUCTURES[12], "iron")).toBe("MB8");
    expect(pathExit(STRUCTURES[12], "gilded")).toBeNull(); // a mini round-robin decides it
  });
  test("which path each circle place starts in (12 players)", () => {
    expect(entryPath(STRUCTURES[12], 0, 1)).toBe(0);
    expect(entryPath(STRUCTURES[12], 1, 2)).toBe(1);
    expect(entryPath(STRUCTURES[12], 2, 4)).toBe(2);
  });
  test("overall standing: path first, then place, then record (11 players, uneven circles)", () => {
    const st = STRUCTURES[11];
    const row = (playerId: string, group: number, place: number, wins: number, losses: number): StandingInput => ({
      playerId,
      group,
      place,
      wins,
      losses,
      pointDiff: 0,
      pointsFor: 0,
    });
    // Circle 2 has 3 players, so its 3rd place goes to the Ashen Path and
    // ranks below the 3rd places of the 4-player circles.
    const big = st.groups.findIndex((s) => s === 4);
    const small = st.groups.findIndex((s) => s === 3);
    const order = overallStanding(st, [
      row("small3", small, 3, 0, 2),
      row("big3", big, 3, 1, 2),
      row("big1", big, 1, 3, 0),
      row("small1", small, 1, 2, 0),
    ]);
    expect(order).toEqual(["big1", "small1", "big3", "small3"]); // both winners at 100%: the id breaks the tie
  });
  test("the player count comes from the group matches", () => {
    expect(playerCountOf(tournament(12, 1, "groups").matches)).toBe(12);
  });
});

describe("the table", () => {
  test("every market's chances add up to about 1, for every player count", () => {
    for (let n = 8; n <= 15; n++) {
      for (const k of outrightMarketsFor(n)) {
        const total = OUTRIGHT_CHANCES[n][k].reduce((a, b) => a + b, 0);
        expect(total).toBeGreaterThan(0.98);
        expect(total).toBeLessThan(1.02);
      }
    }
  });
  test("8 players have no Iron Path, and Upper/Lower names", () => {
    expect(outrightMarketsFor(8)).toEqual(["champion", "gilded", "ashen"]);
    expect(outrightName("gilded", 8)).toBe("Upper Path");
    expect(outrightName("gilded", 12)).toBe("Gilded Path");
    expect(outrightName("champion", 12)).toBe("Hero of Gyrondor");
  });
  test("odds: 5% house edge, capped at ×50, none for a 0 chance", () => {
    expect(outrightOddsFor(0.5)).toBe(1.9);
    expect(outrightOddsFor(0.001)).toBe(50);
    expect(outrightOddsFor(0)).toBeNull();
  });
});

describe("quoting outrights", () => {
  test("closed before the Respite and after Begin the Paths", () => {
    const mid = tournament(12, 2, "groups");
    const unplayed = mid.matches.map((m) => (m.stage === "group" && m.code.endsWith("-6") ? { ...m, matchStatus: "ready" as const } : m));
    expect(quoteOutright("champion", "p0", mid.players, unplayed)).toHaveProperty("error");
    const ko = tournament(12, 2, "knockout");
    expect(quoteOutright("champion", "p0", ko.players, ko.matches)).toEqual({
      error: "Outright wagers are open during the Respite only.",
    });
  });
  test("at the Respite: odds by overall standing, and only for paths a player can win", () => {
    const t = tournament(12, 3, "groups");
    const standing = respiteStanding(t.players, t.matches);
    expect(standing).toHaveLength(12);
    const top = standing[0];
    const last = standing[11];
    expect(quoteOutright("champion", top, t.players, t.matches)).toEqual({ odds: outrightOddsFor(OUTRIGHT_CHANCES[12].champion[0])! });
    expect(quoteOutright("gilded", last, t.players, t.matches)).toEqual({ error: "They can't win that from where they finished." });
    expect(quoteOutright("ashen", last, t.players, t.matches)).toHaveProperty("odds");
    expect(quoteOutright("champion", "nobody", t.players, t.matches)).toHaveProperty("error");
  });
  test("the book has every player for every market", () => {
    const t = tournament(9, 4, "groups");
    const book = outrightBook(t.players, t.matches);
    expect(book.champion.size).toBe(9);
    expect([...book.gilded.values()].filter((o) => o !== null)).toHaveLength(3); // the three circle winners
  });
});

describe("settling outrights", () => {
  test("open until decided, then won or lost (12 players, played out)", () => {
    const early = tournament(12, 5, "knockout");
    expect(outrightState("champion", "p0", early.matches)).toBe("open");
    expect(outrightState("iron", "p0", early.matches)).toBe("open");

    const done = tournament(12, 5, "done");
    const gf = done.matches.find((m) => m.stage === "gf")!;
    expect(outrightState("champion", gf.winner, done.matches)).toBe("won");
    expect(outrightState("champion", gf.loser, done.matches)).toBe("lost");
    const ironWinner = done.matches.find((m) => m.code === "MB8")!.winner;
    expect(outrightState("iron", ironWinner, done.matches)).toBe("won");
  });
  test("a mini round-robin path is decided when its last match is in", () => {
    const done = tournament(12, 6, "done");
    // Lower id always wins, so the lowest id in the Gilded round-robin tops it.
    const rr = done.matches.filter((m) => m.stage === "wb_rr");
    const ids = [...new Set(rr.flatMap((m) => [m.p1, m.p2]))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    expect(outrightState("gilded", ids[0], done.matches)).toBe("won");
    expect(outrightState("gilded", ids[1], done.matches)).toBe("lost");
  });
  test("an Iron Path wager with 8 players is refunded (there isn't one)", () => {
    expect(outrightState("iron", "p0", tournament(8, 7, "done").matches)).toBe("refund");
  });
  test("betState settles outrights from the whole tournament", () => {
    const done = tournament(12, 8, "done");
    const gf = done.matches.find((m) => m.stage === "gf")!;
    expect(betState(outright("champion", gf.winner), undefined, done.matches)).toBe("won");
  });
});
