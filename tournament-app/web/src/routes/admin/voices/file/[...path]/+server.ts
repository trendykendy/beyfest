// Plays an old version or a candidate from tournament-app/voice-review/clips
// on the voice review page. Dev server only, MP3s inside that folder only.

import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RequestHandler } from "./$types";
import { voiceStore } from "$lib/server/voiceStore";

export const GET: RequestHandler = ({ params, locals }) => {
  if (!dev || !locals.organiser) throw error(404);
  const file = voiceStore(join(process.cwd(), "..")).clipFile(params.path);
  if (!file) throw error(404);
  return new Response(readFileSync(file), { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
};
