import type { PageServerLoad } from "./$types";
import { loadLiveView } from "$lib/server/sharedView";
import { bettingEnabled } from "$lib/server/bookie";
import { pbUrlFor } from "$lib/config";
import { starterPicks } from "$lib/server/starterFiles";

// The phone page. The load is shared between phones refreshing together (see
// sharedView.ts); pbUrl is worked out per request, since each phone may reach
// the server by a different address. The starting fighters are for signing in as
// a player, so only before the groups are drawn.
export const load: PageServerLoad = async ({ locals, url }) => {
  const view = await loadLiveView(locals.pb);
  const starters = view.tournament ? [] : await starterPicks();
  return { ...view, starters, pbUrl: pbUrlFor(url), betting: bettingEnabled() };
};
