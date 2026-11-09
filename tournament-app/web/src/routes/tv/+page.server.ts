import { networkInterfaces } from "node:os";
import type { PageServerLoad } from "./$types";
import { loadBetting, loadPeople, loadTournamentView, loadTvState } from "$lib/server/load";
import { playersOf } from "$lib/people";
import { liveUrl } from "$lib/liveUrl";
import { qrPath } from "$lib/qr";
import { pbUrlFor } from "$lib/config";

export const load: PageServerLoad = async ({ locals, url }) => {
  const [view, tv] = await Promise.all([loadTournamentView(locals.pb), loadTvState(locals.pb)]);
  // The QR code for the phone page (/live), drawn here so the TV just shows it.
  const live = liveUrl(networkInterfaces(), url);
  // The Gathering lists the bladers: those signed in on their phones before
  // the draw, the tournament's players after it (until Show the Circles).
  const people = await loadPeople(locals.pb);
  const signedIn = view.tournament ? view.players.map((p) => p.name) : playersOf(people).map((p) => p.name);
  // The wagers, for the Respite's and the Lord of Gold's leaderboards.
  const betting = view.tournament ? await loadBetting(locals.pb, view.tournament.id, people) : { bettors: [], bets: [], loans: [] };
  // PocketBase's address for file links, worked out here so server-rendered
  // parts (Match centre's art panels) can use it; browserPbUrl() needs `location`.
  return { ...view, ...betting, tv, signedIn, liveQr: { url: live, ...qrPath(live) }, pbUrl: pbUrlFor(url) };
};
