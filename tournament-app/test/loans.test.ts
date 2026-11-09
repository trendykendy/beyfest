import { describe, expect, test } from "bun:test";
import { books, leaderboard, type PBBet } from "../web/src/lib/betting";
import { checkAccept, checkRequest, isBroke, loanOf, PACT, PLEDGE, type PBLoan } from "../web/src/lib/loans";
import { START_BALANCE } from "../web/src/lib/odds";
import type { PBMatch } from "../web/src/lib/view";

// Matches with just what match wagers read.
function match(id: string, winner = "", extra: Partial<PBMatch> = {}): PBMatch {
  return {
    id,
    code: id,
    stage: "group",
    roundLabel: "Group 1",
    p1: "A",
    p2: "B",
    p1Score: winner ? (winner === "A" ? 5 : 2) : null,
    p2Score: winner ? (winner === "A" ? 2 : 5) : null,
    liveP1: 0,
    liveP2: 0,
    liveLog: [],
    matchStatus: winner ? "done" : "ready",
    walkover: false,
    winner,
    loser: winner ? (winner === "A" ? "B" : "A") : "",
    ...extra,
  } as PBMatch;
}
let n = 0;
function bet(bettor: string, m: string, pick: string, stake: number, odds: number, created: string): PBBet {
  return { id: `b${++n}`, bettor, market: "match", match: m, pick, selection: "", stake, odds, created };
}
function loan(extra: Partial<PBLoan>): PBLoan {
  return {
    id: `l${++n}`,
    borrower: "x",
    lender: "",
    borrowerName: "Xena",
    lenderName: "",
    amount: 1000,
    ...PACT,
    status: "active",
    activeAt: "2027-03-01T12:00:00.000Z",
    created: "2027-03-01T11:59:00.000Z",
    ...extra,
  };
}
const people = [
  { id: "x", name: "Xena" },
  { id: "y", name: "Yuri" },
];
// Xena goes broke: all 10,000 on a loser before the loan.
const broke = [bet("x", "M0", "B", START_BALANCE, 2, "2027-03-01 11:00:00.000Z")];
const ms = [match("M0", "A"), match("M1", "A"), match("M2", "A"), match("M3", "B"), match("M4")];

describe("books with a Pact", () => {
  test("the loan pays out, and the full repayment is owed", () => {
    const [x] = books(people, broke, ms, [loan({})]);
    expect(x.balance).toBe(1000);
    expect(x.loan).toMatchObject({ repaid: 0, remaining: 2000, pact: true });
  });

  test("half of each win's profit goes to Beyelzebub", () => {
    // 1000 at ×2 wins: profit 1000, half (500) cut.
    const [x] = books(people, [...broke, bet("x", "M1", "A", 1000, 2, "2027-03-01 12:05:00.000Z")], ms, [loan({})]);
    expect(x.balance).toBe(1000 + 1000 - 500);
    expect(x.loan!.remaining).toBe(1500);
    expect(x.bets.find((b) => b.match === "M1")!.cut).toBe(500);
  });

  test("a losing wager costs nothing extra", () => {
    const [x] = books(people, [...broke, bet("x", "M3", "A", 400, 2, "2027-03-01 12:05:00.000Z")], ms, [loan({})]);
    expect(x.balance).toBe(600);
    expect(x.loan!.remaining).toBe(2000);
  });

  test("the cut stops once 2× has been repaid", () => {
    const wins = [
      bet("x", "M1", "A", 1000, 4, "2027-03-01 12:05:00.000Z"), // profit 3000 → cut 1500
      bet("x", "M2", "A", 1000, 4, "2027-03-01 12:10:00.000Z"), // profit 3000 → cut only the last 500
    ];
    const [x] = books(people, [...broke, ...wins], ms, [loan({})]);
    expect(x.loan).toMatchObject({ repaid: 2000, remaining: 0 });
    expect(x.bets.find((b) => b.match === "M2")!.cut).toBe(500);
    expect(x.balance).toBe(1000 + 3000 + 3000 - 2000);
  });

  test("wagers placed before the loan aren't cut", () => {
    const early = bet("x", "M1", "A", 500, 2, "2027-03-01 11:30:00.000Z");
    const [x] = books(people, [...broke, early], ms, [loan({})]);
    expect(x.bets.find((b) => b.match === "M1")!.cut).toBe(0);
  });

  test("an open wager isn't cut until it wins", () => {
    const [x] = books(people, [...broke, bet("x", "M4", "A", 300, 2, "2027-03-01 12:05:00.000Z")], ms, [loan({})]);
    expect(x.atStake).toBe(300);
    expect(x.loan!.repaid).toBe(0);
  });

  test("requested, declined and cancelled loans pay nothing", () => {
    for (const status of ["requested", "declined", "cancelled"] as const) {
      expect(books(people, broke, ms, [loan({ status })])[0].balance).toBe(0);
    }
  });
});

describe("books with a Pledge", () => {
  const pledge = loan({ lender: "y", lenderName: "Yuri", ...PLEDGE, amount: 2000 });

  test("the gold comes out of the lender's balance", () => {
    const [x, y] = books(people, broke, ms, [pledge]);
    expect(x.balance).toBe(2000);
    expect(y.balance).toBe(START_BALANCE - 2000);
    expect(y.lent).toBe(2000);
    expect(x.loan).toMatchObject({ remaining: 3000, pact: false });
  });

  test("a quarter of each win's profit goes back to the lender", () => {
    const win = bet("x", "M1", "A", 2000, 3, "2027-03-01 12:05:00.000Z"); // profit 4000 → 1000
    const [x, y] = books(people, [...broke, win], ms, [pledge]);
    expect(x.balance).toBe(2000 + 4000 - 1000);
    expect(y.balance).toBe(START_BALANCE - 2000 + 1000);
  });
});

describe("the leaderboard with loans", () => {
  test("worth is balance minus what's left to repay; a Pact is marked", () => {
    const rows = leaderboard(books(people, broke, ms, [loan({})]));
    const x = rows.find((r) => r.bettor.id === "x")!;
    expect(x.worth).toBe(1000 - 2000);
    expect(x.pact).toBe(true);
    expect(rows.find((r) => r.bettor.id === "y")!.pact).toBe(false);
  });
  test("a paid-off Pact is no longer marked", () => {
    const wins = [bet("x", "M1", "A", 1000, 10, "2027-03-01 12:05:00.000Z")]; // profit 9000 → cut capped at 2000
    const x = leaderboard(books(people, [...broke, ...wins], ms, [loan({})])).find((r) => r.bettor.id === "x")!;
    expect(x.pact).toBe(false);
  });
});

describe("asking for a loan", () => {
  const wallet = (balance: number, atStake = 0) => ({ balance, atStake });
  const ask = (extra: Partial<Parameters<typeof checkRequest>[0]> = {}) =>
    checkRequest({ borrower: "x", wallet: wallet(40), lender: "", lenderWallet: null, amount: 5000, loans: [], ...extra });

  test("broke means under 100 gold with nothing riding", () => {
    expect(isBroke(wallet(99))).toBe(true);
    expect(isBroke(wallet(100))).toBe(false);
    expect(isBroke(wallet(0, 50))).toBe(false);
  });
  test("a Pact when broke", () => {
    expect(ask()).toEqual({ ok: true });
  });
  test("not when you still have gold or wagers riding", () => {
    expect(ask({ wallet: wallet(500) })).toHaveProperty("error");
    expect(ask({ wallet: wallet(0, 200) })).toHaveProperty("error");
  });
  test("one loan a day: broke again after it means out", () => {
    expect(ask({ loans: [loan({})] })).toHaveProperty("error");
  });
  test("one request at a time", () => {
    expect(ask({ loans: [loan({ status: "requested", lender: "y" })] })).toHaveProperty("error");
  });
  test("a declined or cancelled request doesn't count", () => {
    expect(ask({ loans: [loan({ status: "declined", lender: "y" }), loan({ status: "cancelled" })] })).toEqual({ ok: true });
  });
  test("whole gold, up to the starting balance", () => {
    expect(ask({ amount: 0 })).toHaveProperty("error");
    expect(ask({ amount: START_BALANCE + 1 })).toHaveProperty("error");
    expect(ask({ amount: 10.5 })).toHaveProperty("error");
  });
  test("a Pledge needs a lender who has the gold, and isn't you", () => {
    expect(ask({ lender: "y", lenderWallet: wallet(8000) })).toEqual({ ok: true });
    expect(ask({ lender: "y", lenderWallet: wallet(3000) })).toHaveProperty("error");
    expect(ask({ lender: "y", lenderWallet: null })).toHaveProperty("error");
    expect(ask({ lender: "x", lenderWallet: wallet(9000) })).toHaveProperty("error");
  });
});

describe("accepting a Pledge", () => {
  const req = loan({ status: "requested", lender: "y", lenderName: "Yuri", ...PLEDGE, amount: 2000 });
  const accept = (extra: Partial<Parameters<typeof checkAccept>[0]> = {}) =>
    checkAccept({ loan: req, lender: "y", lenderWallet: { balance: 5000, atStake: 0 }, borrowerWallet: { balance: 10, atStake: 0 }, loans: [req], ...extra });

  test("the lender says yes", () => {
    expect(accept()).toEqual({ ok: true });
  });
  test("only the person asked", () => {
    expect(accept({ lender: "z" })).toHaveProperty("error");
  });
  test("not if the lender has since spent it", () => {
    expect(accept({ lenderWallet: { balance: 1500, atStake: 0 } })).toHaveProperty("error");
  });
  test("not if the borrower got a Pact meanwhile, or isn't broke now", () => {
    expect(accept({ loans: [req, loan({})] })).toHaveProperty("error");
    expect(accept({ borrowerWallet: { balance: 900, atStake: 0 } })).toHaveProperty("error");
  });
  test("not twice", () => {
    expect(accept({ loan: { ...req, status: "active" } })).toHaveProperty("error");
  });
  test("loanOf finds requests sent to a lender", () => {
    expect(loanOf("y", [req]).asked).toHaveLength(1);
  });
});
