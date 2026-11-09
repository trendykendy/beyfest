// The voice review page: every announcer clip, to mark OK or Redo with a
// note, hear its old versions and candidates, and make a candidate live.
// Dev server only: it reads and writes files in the project
// (tournament-app/voice-review, web/static), which a packaged build can't.

import { error, fail } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { statSync } from "node:fs";
import { join } from "node:path";
import type { Actions, PageServerLoad } from "./$types";
import { voiceSections } from "$lib/clips";
import { defaultDirections, VOICE_ID } from "$lib/voiceDirection";
import { readStarters } from "$lib/server/starterFiles";
import { clipKey, voiceStore, type Status } from "$lib/server/voiceStore";

// The dev server runs in tournament-app/web.
const store = () => voiceStore(join(process.cwd(), ".."));

async function starters() {
  return (await readStarters()).starters.map((s) => ({ ...s, name: s.name }));
}

export const load: PageServerLoad = async () => {
  if (!dev) throw error(404, "The voice review only runs on the dev server.");
  const s = store();
  const list = await starters();
  const defaults = defaultDirections(list);
  const marks = s.marks();
  const sections = voiceSections(list).map((section) => ({
    title: section.title,
    clips: section.clips.map((c) => {
      let version = 0;
      try {
        version = Math.round(statSync(join(s.staticDir, c.url)).mtimeMs); // so a new live clip isn't served from cache
      } catch {
        // not made yet
      }
      return {
        url: c.url,
        says: c.says,
        when: c.when,
        key: clipKey(c.url),
        live: version ? `${c.url}?v=${version}` : "",
        mark: marks[c.url] ?? null,
        direction: s.directionFor(c.url, defaults) ?? null,
        log: s.log(c.url),
      };
    }),
  }));
  return { sections, voiceId: VOICE_ID };
};

export const actions: Actions = {
  mark: async ({ request }) => {
    if (!dev) throw error(404);
    const data = await request.formData();
    const url = String(data.get("url") ?? "");
    const status = String(data.get("status") ?? "");
    store().setMark(url, status === "ok" || status === "redo" ? (status as Status) : null, String(data.get("note") ?? "").trim());
    return { saved: url };
  },

  pick: async ({ request }) => {
    if (!dev) throw error(404);
    const data = await request.formData();
    const url = String(data.get("url") ?? "");
    try {
      store().pick(url, String(data.get("file") ?? ""), defaultDirections(await starters()));
    } catch (e) {
      return fail(400, { error: (e as Error).message, url });
    }
    return { picked: url };
  },
};
