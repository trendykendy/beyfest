import {
  FINISH_KEYS,
  MARGIN_BANDS,
  START_BALANCE,
  marginBand,
  marginOpen,
  matchOdds,
  propOdds,
  type FinishKey,
  type MarginBand,
} from "./odds";
import { WAGERS } from "./terms";
import { OUTRIGHT_MARKETS, type OutrightMarket } from "./outrights";
import { isOutright, outrightState } from "./outrightMarket";
import { isPact, type PBLoan } from "./loans";
import type { PBMatch } from "./view";

// An amount of play money as every screen shows it: "12,760 gold".
export const gold = (n: number) => `${n.toLocaleString("en-IE")} ${WAGERS.currency}`;

// What a wager is on:
//   match  — who wins a match (pick: the player)
//   finish — the finishing blow: how the deciding round is won (selection:
//            a FINISH_KEYS key)
//   margin — the winning margin band (selection: a MARGIN_BANDS key)
//   champion, gilded, iron, ashen — outrights: who wins the tournament or a
//            path (pick: the player; no match). See lib/outrightMarket.ts.
export type Market = "match" | "finish" | "margin" | OutrightMarket;
export const MARKETS: readonly Market[] = ["match", "finish", "margin", ...OUTRIGHT_MARKETS];

// The selections a market takes (the others take a player).
export const SELECTIONS: Record<"finish" | "margin", readonly string[]> = {
  finish: FINISH_KEYS,
  margin: MARGIN_BANDS,
};

// The odds a wager would get right now, or why it can't be placed. Shared
// by the phone (to show them) and the server (which checks them again before
// taking the wager), so both agree. Assumes betting on the match is open.
//   match:          `choice` is a player id
//   finish, margin: `choice` is a selection key
export function quoteWager(market: string, m: PBMatch, matches: PBMatch[], choice: string): { odds: number } | { error: string } {
  if (market === "match") {
    if (choice !== m.p1 && choice !== m.p2) return { error: "Pick one of the two bladers." };
    const o = matchOdds(m, matches);
    return { odds: choice === m.p1 ? o.p1 : o.p2 };
  }
  if (market === "finish" || market === "margin") {
    if (!SELECTIONS[market].includes(choice)) return { error: "Pick one of the options." };
    if (market === "margin" && !marginOpen(m)) return { error: "Margin wagers close once the first point is scored." };
    const o = propOdds(m, matches);
    const odds = market === "finish" ? o.finish[choice as FinishKey] : o.margin[choice as MarginBand];
    return odds === null ? { error: "That can't happen now." } : { odds };
  }
  return { error: "Unknown wager." };
}

const ROUND_PTS: Record<string, number> = { spin: 1, knockout: 2, dominant: 3 };

// The finish of a finished match's deciding round, from its round log; null
// when the log doesn't add up to the result (a corrected result drops it).
export function decidingFinish(m: PBMatch): string | null {
  const log = m.liveLog ?? [];
  if (!log.length) return null;
  const pts = (who: 1 | 2) => log.filter((r) => r.who === who).reduce((a, r) => a + (ROUND_PTS[r.finish] ?? 0), 0);
  if (pts(1) !== m.p1Score || pts(2) !== m.p2Score) return null;
  return log[log.length - 1].finish;
}

// Bets as the phone page sees them. Balances are never stored: they're
// worked out from the bets and the match results every time, so entering,
// correcting or walking over a result settles bets with nothing else to run.

// Whoever placed a bet: a signed-in person (lib/people.ts), or one since
// cleared, known by the name kept on the wager.
export interface PBBettor {
  id: string;
  name: string;
}
export interface PBBet {
  id: string;
  bettor: string; // PBBettor id
  market: Market;
  match: string;
  pick: string; // player id
  selection: string; // what was backed, for markets that aren't a player ("" for "match")
  stake: number; // whole gold
  odds: number; // decimal odds, fixed when the bet was placed
  created: string; // ISO
}

export type BetState = "open" | "won" | "lost" | "refund";

// How a bet stands. A walkover refunds it (nobody played). A market this
// version doesn't know is refunded rather than guessed at.
//   match:  refunded if its players changed under it (a corrected result
//           upstream), since the pick isn't in that match any more.
//   finish: from the deciding round in the round log; refunded if the log
//           doesn't add up to the result (it's dropped when a result is
//           corrected).
//   margin: from the final score.
// Finish and margin wagers are on the match itself, so they ride on
// whoever plays it.
//   outrights: from the whole tournament (`matches`), open until the
//           champion or the path's winner is known.
export function betState(bet: PBBet, match: PBMatch | undefined, matches: PBMatch[] = []): BetState {
  if (!MARKETS.includes(bet.market)) return "refund";
  if (isOutright(bet.market)) return outrightState(bet.market, bet.pick, matches);
  if (!match) return "refund";
  if (bet.market === "match" && bet.pick !== match.p1 && bet.pick !== match.p2) return "refund";
  if (match.matchStatus !== "done") return "open";
  if (match.walkover) return "refund";
  if (bet.market === "finish") {
    const f = decidingFinish(match);
    return f === null ? "refund" : f === bet.selection ? "won" : "lost";
  }
  if (bet.market === "margin") {
    return marginBand(match.p1Score ?? 0, match.p2Score ?? 0) === bet.selection ? "won" : "lost";
  }
  return match.winner === bet.pick ? "won" : "lost";
}

// What a bet pays back (stake included): the full payout when won, the
// stake when refunded.
export function payout(bet: PBBet, state: BetState): number {
  if (state === "won") return Math.round(bet.stake * bet.odds);
  if (state === "refund") return bet.stake;
  return 0;
}

// cut: what a won wager gave up to a loan (0 otherwise).
export type SettledBet = PBBet & { state: BetState; returns: number; cut: number };
// A loan as its borrower's book sees it.
export type LoanStanding = { loan: PBLoan; repaid: number; remaining: number; pact: boolean };
export type BettorBook = {
  bettor: PBBettor;
  balance: number; // money to bet with now (open stakes are out of it)
  atStake: number; // in open bets
  bets: SettledBet[]; // newest first
  loan: LoanStanding | null; // their active loan, if any
  lent: number; // gold they've lent out to others (Pledges)
};

// PocketBase dates ("2026-11-09 10:40:11.481Z") and ISO both, as ms.
const ms = (s: string) => Date.parse(s.replace(" ", "T")) || 0;

// Every bettor's balance and bets, and their loans. Like balances, loan
// repayments are never stored: an active loan pays the borrower its amount
// (out of the lender's balance for a Pledge), and every wager the borrower
// placed after it that wins gives up `rate` of its profit to the lender,
// in the order placed, until amount × capMult has been repaid. A losing
// wager costs nothing extra.
export function books(bettors: PBBettor[], bets: PBBet[], matches: PBMatch[], loans: PBLoan[] = []): BettorBook[] {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const out = new Map<string, BettorBook>(
    bettors.map((b) => [b.id, { bettor: b, balance: START_BALANCE, atStake: 0, bets: [], loan: null, lent: 0 }]),
  );
  for (const bet of bets) {
    const book = out.get(bet.bettor);
    if (!book) continue;
    const state = betState(bet, byId.get(bet.match), matches);
    const returns = payout(bet, state);
    book.balance += returns - bet.stake;
    if (state === "open") book.atStake += bet.stake;
    book.bets.push({ ...bet, state, returns, cut: 0 });
  }
  for (const loan of loans.filter((l) => l.status === "active")) {
    const borrower = out.get(loan.borrower);
    if (!borrower) continue;
    const lender = loan.lender ? out.get(loan.lender) : undefined;
    borrower.balance += loan.amount;
    if (lender) {
      lender.balance -= loan.amount;
      lender.lent += loan.amount;
    }
    const cap = Math.round(loan.amount * loan.capMult);
    let repaid = 0;
    const after = borrower.bets
      .filter((b) => b.state === "won" && ms(b.created) > ms(loan.activeAt))
      .sort((a, b) => ms(a.created) - ms(b.created));
    for (const b of after) {
      if (repaid >= cap) break;
      const cut = Math.min(Math.floor((b.returns - b.stake) * loan.rate), cap - repaid);
      if (cut <= 0) continue;
      b.cut = cut;
      repaid += cut;
      borrower.balance -= cut;
      if (lender) lender.balance += cut;
    }
    borrower.loan = { loan, repaid, remaining: cap - repaid, pact: isPact(loan) };
  }
  for (const book of out.values()) book.bets.sort((a, b) => b.created.localeCompare(a.created));
  return [...out.values()];
}

// The leaderboard: what each bettor would have if every open bet were
// refunded (balance + stakes still riding), minus what they still owe on a
// loan (so a loan never lifts anyone up the board), richest first. pact:
// in debt to Beyelzebub (the board marks them).
export function leaderboard(all: BettorBook[]): { bettor: PBBettor; worth: number; rank: number; pact: boolean }[] {
  const rows = all
    .map((b) => ({
      bettor: b.bettor,
      worth: b.balance + b.atStake - (b.loan?.remaining ?? 0),
      rank: 0,
      pact: !!b.loan?.pact && b.loan.remaining > 0,
    }))
    .sort((a, b) => b.worth - a.worth || a.bettor.name.localeCompare(b.bettor.name));
  // Equal worth shares a rank (1, 2, 2, 4).
  rows.forEach((r, i) => (r.rank = i > 0 && rows[i - 1].worth === r.worth ? rows[i - 1].rank : i + 1));
  return rows;
}

// Names are compared ignoring case and spaces, like followed bladers.
export const sameName = (a: string, b: string) =>
  a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase();

// A betting name as typed: trimmed, inner spaces squashed, 2–16 characters.
export function cleanName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 16 ? name : null;
}
