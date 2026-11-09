import { describe, expect, test } from "bun:test";
import {
  endings,
  FINISH_PRIOR,
  finishFrequencies,
  marginBand,
  oddsFor,
  propOdds,
  type FinishFreq,
} from "../web/src/lib/odds";
import { betState, decidingFinish, quoteWager, type PBBet } from "../web/src/lib/betting";
import type { LiveRound, PBMatch } from "../web/src/lib/view";

// A group match (first to 5) with just the fields the markets read.
function match(extra: Partial<PBMatch> = {}): PBMatch {
  return {
    id: "M",
    code: "M",
    stage: "group",
    roundLabel: "Group 1",
    p1: "A",
    p2: "B",
    p1Score: null,
    p2Score: null,
    liveP1: 0,
    liveP2: 0,
    liveLog: [],
    matchStatus: "ready",
    walkover: false,
    winner: "",
    loser: "",
    ...extra,
  } as PBMatch;
}
const round = (who: 1 | 2, finish: string): LiveRound => ({ who, finish });
// A finished 5–2 match: A spins (1), B knocks out (2), A knocks out twice
// (3, then 5), so the deciding round is a knockout.
const fiveTwo = match({
  matchStatus: "done",
  p1Score: 5,
  p2Score: 2,
  winner: "A",
  loser: "B",
  liveLog: [round(1, "spin"), round(2, "knockout"), round(1, "knockout"), round(1, "knockout")],
});
function wager(market: PBBet["market"], selection: string): PBBet {
  return { id: "w", bettor: "x", market, match: "M", pick: "", selection, stake: 100, odds: 3, created: "2027-03-01T10:00:00Z" };
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("endings", () => {
  test("every way a match can end adds up to 1", () => {
    expect(sum(endings(5, 0, 0, 0.5, FINISH_PRIOR).map((e) => e.p))).toBeCloseTo(1, 10);
    expect(sum(endings(9, 4, 7, 0.62, FINISH_PRIOR).map((e) => e.p))).toBeCloseTo(1, 10);
  });

  test("only spins: every match ends on a spin, by the target exactly", () => {
    const spins: FinishFreq = { spin: 1, knockout: 0, dominant: 0 };
    const all = endings(5, 0, 0, 0.5, spins);
    expect(all.every((e) => e.finish === "spin" && Math.max(e.s1, e.s2) === 5)).toBe(true);
  });

  test("a finish can overshoot the target (4 + a 3-point finish = 7)", () => {
    const all = endings(5, 4, 0, 1, { spin: 0, knockout: 0, dominant: 1 });
    expect(all).toEqual([{ winner: 1, finish: "dominant", s1: 7, s2: 0, p: 1 }]);
  });

  test("the stronger blader wins more of the endings", () => {
    const p1Wins = sum(endings(5, 0, 0, 0.65, FINISH_PRIOR).filter((e) => e.winner === 1).map((e) => e.p));
    expect(p1Wins).toBeGreaterThan(0.6);
  });
});

describe("marginBand", () => {
  test("the loser scored nothing: Whitewash", () => {
    expect(marginBand(5, 0)).toBe("whitewash");
    expect(marginBand(0, 7)).toBe("whitewash");
  });
  test("won by 1 or 2: Nail-biter", () => {
    expect(marginBand(5, 4)).toBe("nailbiter");
    expect(marginBand(6, 4)).toBe("nailbiter");
  });
  test("anything else: Comfortable", () => {
    expect(marginBand(5, 2)).toBe("comfortable");
    expect(marginBand(1, 9)).toBe("comfortable");
  });
});

describe("finishFrequencies", () => {
  test("before any rounds: the prior", () => {
    const f = finishFrequencies([]);
    expect(f.spin).toBeCloseTo(FINISH_PRIOR.spin, 10);
    expect(f.dominant).toBeCloseTo(FINISH_PRIOR.dominant, 10);
  });
  test("the day's rounds pull it their way, and it still adds up to 1", () => {
    const log = Array.from({ length: 40 }, () => round(1, "dominant"));
    const f = finishFrequencies([match({ liveLog: log })]);
    expect(f.dominant).toBeCloseTo((0.2 * 40 + 40) / 80, 10);
    expect(f.spin + f.knockout + f.dominant).toBeCloseTo(1, 10);
  });
});

describe("propOdds", () => {
  test("a fresh match offers every finish and every band", () => {
    const o = propOdds(match(), []);
    expect(Object.values(o.finish).every((x) => x !== null)).toBe(true);
    expect(Object.values(o.margin).every((x) => x !== null)).toBe(true);
  });
  test("once both have scored, a Whitewash isn't offered", () => {
    expect(propOdds(match({ liveP1: 1, liveP2: 2 }), []).margin.whitewash).toBeNull();
  });
  test("bigger finishes decide more matches than their share of rounds", () => {
    // With the prior (40% spin, 40% knockout, 20% dominant rounds) about 19%
    // of first-to-5 matches end on a spin, 45% on a knockout, 36% on a
    // dominant finish: a big finish crosses the line from further away.
    const o = propOdds(match(), []);
    expect(o.finish.knockout!).toBeLessThan(o.finish.dominant!);
    expect(o.finish.dominant!).toBeLessThan(o.finish.spin!);
  });
  test("the house edge applies, as on match odds", () => {
    expect(oddsFor(1)).toBe(1.05);
    expect(oddsFor(0.5)).toBe(1.9);
  });
});

describe("quoteWager", () => {
  test("a match wager on one of the two bladers", () => {
    expect(quoteWager("match", match(), [], "A")).toEqual({ odds: 1.9 });
    expect(quoteWager("match", match(), [], "Z")).toEqual({ error: "Pick one of the two bladers." });
  });
  test("finish and margin wagers quote the live prop odds", () => {
    const p = propOdds(match(), []);
    expect(quoteWager("finish", match(), [], "dominant")).toEqual({ odds: p.finish.dominant! });
    expect(quoteWager("margin", match(), [], "nailbiter")).toEqual({ odds: p.margin.nailbiter! });
  });
  test("an unknown option, an impossible one, or an unknown market is refused", () => {
    expect(quoteWager("finish", match(), [], "burst")).toHaveProperty("error");
    expect(quoteWager("margin", match({ liveP1: 2, liveP2: 1 }), [], "whitewash")).toEqual({ error: "That can't happen now." });
    expect(quoteWager("exact", match(), [], "5-0")).toEqual({ error: "Unknown wager." });
  });
});

describe("decidingFinish", () => {
  test("the last round of a log that adds up", () => {
    expect(decidingFinish(fiveTwo)).toBe("knockout");
  });
  test("no log, or one that doesn't add up (a corrected result): null", () => {
    expect(decidingFinish(match({ matchStatus: "done", p1Score: 5, p2Score: 0 }))).toBeNull();
    expect(decidingFinish({ ...fiveTwo, p2Score: 3 })).toBeNull();
  });
});

describe("settling finish and margin wagers", () => {
  test("open until the match is done", () => {
    expect(betState(wager("finish", "spin"), match())).toBe("open");
    expect(betState(wager("margin", "nailbiter"), match())).toBe("open");
  });
  test("finishing blow: won on the deciding round's finish, lost otherwise", () => {
    expect(betState(wager("finish", "knockout"), fiveTwo)).toBe("won");
    expect(betState(wager("finish", "spin"), fiveTwo)).toBe("lost");
  });
  test("finishing blow: refunded when the round log was dropped", () => {
    expect(betState(wager("finish", "knockout"), { ...fiveTwo, liveLog: [] })).toBe("refund");
  });
  test("margin: settled from the final score", () => {
    expect(betState(wager("margin", "comfortable"), fiveTwo)).toBe("won");
    expect(betState(wager("margin", "nailbiter"), fiveTwo)).toBe("lost");
  });
  test("a walkover refunds both", () => {
    const wo = match({ matchStatus: "done", walkover: true, p1Score: 5, p2Score: 0, winner: "A" });
    expect(betState(wager("finish", "spin"), wo)).toBe("refund");
    expect(betState(wager("margin", "whitewash"), wo)).toBe("refund");
  });
  test("ride on the match whoever plays it (no pick to lose)", () => {
    expect(betState(wager("margin", "comfortable"), { ...fiveTwo, p1: "C" })).toBe("won");
  });
});
