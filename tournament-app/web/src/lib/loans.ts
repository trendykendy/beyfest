// Loans for anyone who goes broke wagering (migration 1710002700_loans):
// a Pact with Beyelzebub, or a Pledge from another person. The rules, free
// of PocketBase so they can be tested; the phone endpoint (/live/loan)
// checks every step through them. How repayments come off is in books()
// (lib/betting.ts), worked out from the wagers like balances are.
//
// Decided (planning doc, Betting): borrow only when broke; the borrower
// picks the amount, up to the starting balance (and what a lender has); the
// lender takes a cut of each winning wager's profit until repaid; one loan
// per person per tournament, so going broke again means out for the day.

import { START_BALANCE } from "./odds";
import { WAGERS } from "./terms";

// Under this, with no wagers open, you're broke and may borrow (the
// smallest stake chip; decided 2026-11-09).
export const BROKE_BELOW = 100;

export const PACT = { rate: 0.5, capMult: 2 }; // Beyelzebub: half of every win, until 2× is repaid
export const PLEDGE = { rate: 0.25, capMult: 1.5 }; // a person: a quarter, until 1.5×

export type LoanStatus = "requested" | "active" | "declined" | "cancelled";

export interface PBLoan {
  id: string;
  borrower: string; // bettor id (a person, or "gone:<name>" once sign-ins are cleared)
  lender: string; // bettor id; "" = Beyelzebub
  borrowerName: string;
  lenderName: string; // "" for Beyelzebub
  amount: number;
  rate: number; // cut of each winning wager's profit
  capMult: number; // the lender is repaid at amount × capMult
  status: LoanStatus;
  activeAt: string; // ISO, "" until active
  created: string; // ISO
}

export const isPact = (l: Pick<PBLoan, "lender" | "lenderName">) => !l.lender && !l.lenderName;
export const lenderName = (l: PBLoan) => (isPact(l) ? WAGERS.demonLender : l.lenderName);

// A wallet as the rules need it (from books()).
export type Wallet = { balance: number; atStake: number };
export const isBroke = (w: Wallet) => w.balance < BROKE_BELOW && w.atStake === 0;

// Where someone stands with loans in this tournament.
export function loanOf(personId: string, loans: PBLoan[]) {
  return {
    active: loans.find((l) => l.borrower === personId && l.status === "active") ?? null,
    waiting: loans.find((l) => l.borrower === personId && l.status === "requested") ?? null,
    // Pledge requests others have sent this person.
    asked: loans.filter((l) => l.lender === personId && l.status === "requested"),
  };
}

// Asking for a loan. lender "" = a Pact with Beyelzebub (always there);
// otherwise a Pledge request to that person, who has to accept it.
export function checkRequest(a: {
  borrower: string;
  wallet: Wallet;
  lender: string;
  lenderWallet: Wallet | null;
  amount: number;
  loans: PBLoan[];
}): { ok: true } | { error: string } {
  const mine = loanOf(a.borrower, a.loans);
  if (mine.waiting) return { error: "You've already asked for a loan. Cancel that one first." };
  if (!isBroke(a.wallet)) return { error: `Loans are for when you're broke: under ${BROKE_BELOW} gold with no wagers open.` };
  if (mine.active) return { error: "One loan a day, and you've had yours. You're out of gold until the next event." };
  if (!Number.isInteger(a.amount) || a.amount < 1 || a.amount > START_BALANCE) {
    return { error: `Borrow a whole number of gold, up to ${START_BALANCE.toLocaleString("en-IE")}.` };
  }
  if (a.lender) {
    if (a.lender === a.borrower) return { error: "You can't lend to yourself." };
    if (!a.lenderWallet) return { error: "They're not wagering in this tournament." };
    if (a.lenderWallet.balance < a.amount) return { error: "They don't have that much to lend." };
  }
  return { ok: true };
}

// The lender saying yes to a Pledge. Checked again now, since things may
// have changed since the request (the lender spent it, the borrower got a
// Pact instead).
export function checkAccept(a: {
  loan: PBLoan;
  lender: string; // who's accepting
  lenderWallet: Wallet | null;
  borrowerWallet: Wallet | null;
  loans: PBLoan[];
}): { ok: true } | { error: string } {
  if (a.loan.status !== "requested") return { error: "That request isn't waiting any more." };
  if (a.loan.lender !== a.lender) return { error: "That request isn't to you." };
  if (!a.lenderWallet || a.lenderWallet.balance < a.loan.amount) return { error: "You don't have that much to lend now." };
  if (loanOf(a.loan.borrower, a.loans).active) return { error: "They've already got a loan." };
  if (!a.borrowerWallet || !isBroke(a.borrowerWallet)) return { error: "They're not broke any more." };
  return { ok: true };
}
