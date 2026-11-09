import { networkInterfaces } from "node:os";
import type { PageServerLoad } from "./$types";
import { loadPeople, loadTournamentView, loadTvState } from "$lib/server/load";
import { playersOf } from "$lib/people";
import { loadNetwork } from "$lib/server/network";
import { liveUrl } from "$lib/liveUrl";
import { qrPath } from "$lib/qr";
import { pbUrlFor } from "$lib/config";

export const load: PageServerLoad = async ({ locals, url }) => {
  const [view, tv, network] = await Promise.all([
    loadTournamentView(locals.pb),
    loadTvState(locals.pb),
    loadNetwork(),
  ]);
  // The QR code for the phone page (/live), drawn here so the TV just shows it.
  const live = liveUrl(network, networkInterfaces(), url);
  // Before the draw, standby lists the bladers who've signed in on their phones.
  const signedIn = view.tournament ? [] : playersOf(await loadPeople(locals.pb)).map((p) => p.name);
  // PocketBase's address for file links, worked out here so server-rendered
  // parts (Match centre's art panels) can use it; browserPbUrl() needs `location`.
  return { ...view, tv, network, signedIn, liveQr: { url: live, ...qrPath(live) }, pbUrl: pbUrlFor(url) };
};
