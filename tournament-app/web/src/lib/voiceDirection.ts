// How each announcer clip is voiced in ElevenLabs: the text sent (audio tags
// included), the model and the voice settings. scripts/announcer.ts makes the
// clips from these, and the voice review page (/admin/voices) shows them.
//
// Settled by ear on 2026-11-09 (audio/audition/battle-cry-3, take 09): the
// accent tag holds her refined English accent; for a fighter's own call, the
// pause after the name gives an almost-growled name, then the cry. A line
// re-done on the review page keeps its own direction (voice-review/
// directions.json), which takes the place of the default here.

import { voiceSections, type Clip, type StarterVoices } from "./clips";
import { FIGHTER_CALLS, type FighterCall } from "./fighters";

export interface Direction {
  text: string; // what ElevenLabs reads, audio tags included
  model: string;
  stability: number;
  similarity: number;
  environment?: string; // a reverb from ElevenLabs' audio effects, e.g. "hall"
}

export const VOICE_ID = "KDGe18TKrV5XLPaFibpV"; // "Tetrafatalis Announcer" in the ElevenLabs account
export const MODEL = "eleven_v4";
export const ACCENT = "[regal, commanding, in a refined English accent]";
const BASE = { model: MODEL, stability: 0.3, similarity: 0.95, environment: "hall" };

const CRY_LINES: Record<FighterCall, (name: string) => string> = {
  callVictorious: (name) => `${ACCENT} ${name}... [exclaiming triumphantly] is VICTORIOUS!!!`,
  callRoyaleChampion: (name) => `${ACCENT} ${name}... [exclaiming triumphantly] Last One Standing!!!`,
  callChampion: (name) => `${ACCENT} ${name}... [exclaiming triumphantly] Hero of Gyrondor!!!`,
};

// What the voice reads for a line on the list. A line written "…Still
// Standing!" is said straight after a name, so the leading and trailing
// ellipses go ("and", "Still Standing!"); one in the middle stays as a pause.
export function spokenText(says: string): string {
  return says.replace(/^[\s…]+/, "").replace(/[\s…]+$/, "");
}

// A shared line or a name call: the accent tag, plus "exclaiming" on a line
// that ends in "!" ("and" is said plainly, between names).
function announced(c: Clip): Direction {
  const text = spokenText(c.says);
  return { ...BASE, text: `${text.endsWith("!") ? `${ACCENT} [exclaiming]` : ACCENT} ${text}` };
}

/** The default direction for every voice clip, by its URL. */
export function defaultDirections(starters: (StarterVoices & { name: string })[]): Map<string, Direction> {
  const out = new Map<string, Direction>();
  for (const s of voiceSections(starters)) for (const c of s.clips) out.set(c.url, announced(c));
  // Each fighter's own calls are battle cries.
  for (const st of starters) {
    for (const call of FIGHTER_CALLS) {
      const file = st[call];
      if (file) out.set(`/starter-fighters/${file}`, { ...BASE, text: CRY_LINES[call](st.name) });
    }
  }
  return out;
}

// Candidates for a line marked to redo, when none were written for it: the
// same line with other ways of asking for an announcement in place of
// "exclaiming" (which can come out sounding surprised), and one "!" instead
// of three.
const ALTERNATIVES = ["[proclaiming]", "[announcing with authority]", "[declaring]"];

export function variantsOf(d: Direction): Direction[] {
  const calm = (t: string) => t.replace(/!{2,}/g, "!");
  const tagged = /\[exclaiming[^\]]*\]/.test(d.text);
  return ALTERNATIVES.map((tag) => ({
    ...d,
    text: calm(tagged ? d.text.replace(/\[exclaiming[^\]]*\]/, tag) : d.text.replace(ACCENT, `${ACCENT} ${tag}`)),
  }));
}
