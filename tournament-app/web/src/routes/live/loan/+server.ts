import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type PocketBase from "pocketbase";
import type { RecordModel } from "pocketbase";
import { bookie } from "$lib/server/bookie";
import { oneAtATime } from "$lib/server/oneAtATime";
import { loadBetting, loadPeople, loadTournamentView } from "$lib/server/load";
import { books } from "$lib/betting";
import { checkAccept, checkRequest, PACT, PLEDGE } from "$lib/loans";

// Loans on the phone page (see lib/loans.ts for the rules).
//   { action: "request", id, token, lender, amount } → { ok: true }
//       lender "" = a Pact with Beyelzebub (active at once); else a Pledge
//       request to that person, who accepts or declines on their phone
//   { action: "accept" | "decline", id, token, loan } → { ok: true }   (the lender)
//   { action: "cancel", id, token, loan }             → { ok: true }   (the borrower)
// id and token are the phone's sign-in. Everything is checked here against
// fresh data and written as the bookie; one at a time with wagers, so a loan
// and a wager can't both spend the same gold.

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") error(400, "Bad request");
  const pb = await bookie();
  if (!pb) error(503, "Betting is closed right now.");
  return oneAtATime(() => handle(pb, body));
};

async function handle(pb: PocketBase, body: Record<string, unknown>) {
  const id = String(body.id ?? "");
  const me = await pb
    .collection("people")
    .getOne(id)
    .catch(() => null);
  if (!me) error(410, "Sign in again.");
  if (!me.token || me.token !== body.token) error(403, "This phone isn't signed in as that name.");

  const view = await loadTournamentView(pb);
  if (!view.tournament) error(409, "Betting opens once the groups are drawn.");
  const people = await loadPeople(pb);
  const { bettors, bets, loans } = await loadBetting(pb, view.tournament.id, people);
  const all = books(bettors, bets, view.matches, loans);
  const wallet = (who: string) => all.find((b) => b.bettor.id === who) ?? null;

  if (body.action === "request") {
    const lender = String(body.lender ?? "");
    const amount = Number(body.amount);
    const ok = checkRequest({ borrower: id, wallet: wallet(id) ?? { balance: 0, atStake: 0 }, lender, lenderWallet: lender ? wallet(lender) : null, amount, loans });
    if ("error" in ok) error(409, ok.error);
    const lenderName = lender ? (people.find((p) => p.id === lender)?.name ?? "") : "";
    const terms = lender ? PLEDGE : PACT;
    await pb.collection("loans").create({
      tournament: view.tournament.id,
      borrower: id,
      borrowerName: me.name,
      lender,
      lenderName,
      amount,
      ...terms,
      // A Pact needs nobody's say-so.
      status: lender ? "requested" : "active",
      activeAt: lender ? "" : new Date().toISOString(),
    });
    return json({ ok: true });
  }

  const loan = await pb
    .collection("loans")
    .getOne(String(body.loan ?? ""))
    .catch(() => null);
  if (!loan || loan.tournament !== view.tournament.id) error(404, "That loan isn't here any more.");
  const asLoan = loans.find((l) => l.id === loan.id)!;

  if (body.action === "accept") {
    const ok = checkAccept({ loan: asLoan, lender: id, lenderWallet: wallet(id), borrowerWallet: wallet(asLoan.borrower), loans });
    if ("error" in ok) error(409, ok.error);
    await setStatus(pb, loan, { status: "active", activeAt: new Date().toISOString() });
    return json({ ok: true });
  }
  if (body.action === "decline") {
    if (asLoan.lender !== id || asLoan.status !== "requested") error(409, "That request isn't waiting for you.");
    await setStatus(pb, loan, { status: "declined" });
    return json({ ok: true });
  }
  if (body.action === "cancel") {
    if (asLoan.borrower !== id || asLoan.status !== "requested") error(409, "There's no request of yours to cancel.");
    await setStatus(pb, loan, { status: "cancelled" });
    return json({ ok: true });
  }
  error(400, "Bad request");
}

const setStatus = (pb: PocketBase, loan: RecordModel, change: Record<string, string>) => pb.collection("loans").update(loan.id, change);
