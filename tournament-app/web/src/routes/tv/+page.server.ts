import { networkInterfaces } from "node:os";
import type { PageServerLoad } from "./$types";
import { loadTournamentView, loadTvState } from "$lib/server/load";
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
  // PocketBase's address for file links, worked out here so server-rendered
  // parts (Match centre's art panels) can use it; browserPbUrl() needs `location`.
  return { ...view, tv, network, liveQr: { url: live, ...qrPath(live) }, pbUrl: pbUrlFor(url) };
};
