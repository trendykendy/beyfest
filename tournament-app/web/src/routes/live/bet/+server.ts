import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import type PocketBase from "pocketbase";
import { bookie } from "$lib/server/bookie";
import { oneAtATime } from "$lib/server/oneAtATime";
import { loadBetting, loadPeople, loadTournamentView } from "$lib/server/load";
import { books, gold, quoteWager } from "$lib/betting";
import { bettingOpen } from "$lib/odds";
import { isOutright, quoteOutright } from "$lib/outrightMarket";

// The phone page's betting (play money, see lib/odds.ts and lib/betting.ts).
//   { action: "bet", id, token, match, market, choice, stake, odds } → { ok: true }
// market: "match" (choice = a player id), "finish" or "margin" (choice = a
// selection key), or an outright: "champion", "gilded", "iron", "ashen"
// (choice = a player id; no match). A missing market is a match wager with
// `pick` as before.
// id and token are the phone's sign-in (/live/me). Everything is checked
// here against fresh data, never trusted from the phone. If the odds moved
// since the phone showed them, nothing is placed and the reply (409) carries
// the new odds for the phone to offer instead.

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") error(400, "Bad request");
  const pb = await bookie();
  if (!pb) error(503, "Betting is closed right now.");
  return oneAtATime(() => bet(pb, body));
};

async function bet(
  pb: PocketBase,
  body: { id?: unknown; token?: unknown; match?: unknown; market?: unknown; choice?: unknown; pick?: unknown; stake?: unknown; odds?: unknown },
) {
  const id = String(body.id ?? "");
  const me = await pb
    .collection("people")
    .getOne(id)
    .catch(() => null);
  // Removed by the organiser, or sign-ins were cleared: sign in again.
  if (!me) error(410, "Sign in again to bet.");
  if (!me.token || me.token !== body.token) error(403, "This phone can't bet as that name.");

  const view = await loadTournamentView(pb);
  if (!view.tournament) error(409, "Betting opens once the groups are drawn.");
  const market = String(body.market ?? "match");
  const choice = String(body.choice ?? body.pick ?? "");
  // Outrights are on the tournament, not a match.
  const outright = isOutright(market);
  const m = outright ? null : view.matches.find((x) => x.id === body.match);
  if (!outright && (!m || !bettingOpen(m))) error(409, "Betting on that match has closed.");
  const quote = outright ? quoteOutright(market, choice, view.players, view.matches) : quoteWager(market, m!, view.matches, choice);
  if ("error" in quote) error(outright ? 409 : 400, quote.error);

  const people = await loadPeople(pb);
  const { bettors, bets, loans } = await loadBetting(pb, view.tournament.id, people);
  const mine = books(bettors, bets, view.matches, loans).find((b) => b.bettor.id === id);
  const balance = mine?.balance ?? 0;
  const stake = Number(body.stake);
  if (!Number.isInteger(stake) || stake < 1) error(400, "Wager a whole number of gold.");
  if (stake > balance) error(400, `You only have ${gold(balance)}.`);

  const now = quote.odds;
  if (now !== Number(body.odds)) return json({ odds: now, message: "The odds just changed." }, { status: 409 });

  const onPlayer = market === "match" || outright; // these back a player; the rest a selection
  await pb.collection("bets").create({
    tournament: view.tournament.id,
    person: id,
    who: me.name,
    market,
    match: m?.id ?? "",
    pick: onPlayer ? choice : "",
    selection: onPlayer ? "" : choice,
    stake,
    odds: now,
  });
  return json({ ok: true });
}
