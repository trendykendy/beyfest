// The starting fighters: a list shipped with the app (static/starter-fighters/
// fighters.json, plus the images and voices it names) that the Fighters admin
// page can load into the library in one go.
//
// It never overwrites: a starter that's missing is added, and one that's
// already there (same combat name or player name) only gets the fields it's
// missing filled in. So it's safe to press again, e.g. after an update ships
// more starters, and edits made on the admin page are kept.

import type { Face, PBFighter } from "./fighters";

export interface Starter {
  name: string;
  player?: string;
  kana?: string;
  image?: string; // file name in static/starter-fighters/
  imageMirrored?: string; // file name in static/starter-fighters/: `image` mirrored by hand
  victory?: string; // file name in static/starter-fighters/
  royaleVictory?: string; // file name in static/starter-fighters/
  profile?: string; // file name in static/starter-fighters/
  voice?: string; // file name in static/starter-fighters/: the name call
  // Whole calls (file names in static/starter-fighters/); a file that isn't
  // there yet is skipped (starterFiles.ts), so these can be listed early.
  callVictorious?: string;
  callRoyaleChampion?: string;
  callChampion?: string;
  mirror?: boolean;
  face?: Face; // where the face is in `image` (scripts/find-faces.py)
}

export type StarterStep =
  | { kind: "add"; starter: Starter }
  // fields: the text fields to set; files: which files to upload
  | { kind: "fill"; id: string; starter: Starter; fields: Partial<Pick<PBFighter, "player" | "kana" | "face">>; files: StarterFile[] };

export type StarterFile =
  | "image"
  | "imageMirrored"
  | "victory"
  | "royaleVictory"
  | "profile"
  | "voice"
  | "callVictorious"
  | "callRoyaleChampion"
  | "callChampion";

const key = (s: string | undefined) => (s ?? "").trim().toLowerCase();

// PocketBase stores an upload as "<name>_<random>.<ext>", so "breycist.png"
// comes back as e.g. "breycist_x8k2p9q1zz.png".
function sameFile(stored: string, original: string | undefined): boolean {
  if (!original) return false;
  const dot = original.lastIndexOf(".");
  const base = (dot < 0 ? original : original.slice(0, dot)).toLowerCase();
  const ext = dot < 0 ? "" : original.slice(dot).toLowerCase();
  const s = stored.toLowerCase();
  return s === base + ext || (s.startsWith(base + "_") && s.endsWith(ext));
}

// `pictures`: fighters whose image is byte-for-byte a starter's picture,
// fighter id → that picture's file name (the Fighters page works it out,
// since a picture uploaded by hand keeps its own file name).
export function planStarters(starters: Starter[], library: PBFighter[], pictures = new Map<string, string>()): StarterStep[] {
  const steps: StarterStep[] = [];
  for (const s of starters) {
    const f =
      library.find((x) => key(x.name) === key(s.name)) ??
      (s.player ? library.find((x) => key(x.player) === key(s.player)) : undefined);
    if (!f) {
      steps.push({ kind: "add", starter: s });
      continue;
    }
    const fields: Partial<Pick<PBFighter, "player" | "kana" | "face">> = {};
    // A player name only goes in if nobody else has it already.
    if (!f.player && s.player && !library.some((x) => key(x.player) === key(s.player))) fields.player = s.player;
    if (!f.kana && s.kana) fields.kana = s.kana;
    // The face point belongs to the starter's own picture, so it only goes in
    // with that picture, or onto it if it's still the starter's.
    const ownPicture = !f.image || sameFile(f.image, s.image) || (!!s.image && pictures.get(f.id) === s.image);
    if (!f.face && s.face && ownPicture) fields.face = s.face;
    const files: StarterFile[] = [];
    if (!f.image && s.image) files.push("image");
    // Like the face point, the mirror image only goes with the starter's own picture.
    if (!f.imageMirrored && s.imageMirrored && ownPicture) files.push("imageMirrored");
    if (!f.victory && s.victory) files.push("victory");
    if (!f.royaleVictory && s.royaleVictory) files.push("royaleVictory");
    if (!f.profile && s.profile) files.push("profile");
    if (!f.voice && s.voice) files.push("voice");
    for (const call of ["callVictorious", "callRoyaleChampion", "callChampion"] as const) {
      if (!f[call] && s[call]) files.push(call);
    }
    if (Object.keys(fields).length || files.length) steps.push({ kind: "fill", id: f.id, starter: s, fields, files });
  }
  return steps;
}

// The starters playing in a tournament: those whose player or combat name is
// among the bladers. Anyone else stays out of the library, so a starter who
// was deleted on purpose doesn't come back just because a tournament began.
export function startersFor(starters: Starter[], names: string[]): Starter[] {
  const playing = new Set(names.map(key));
  return starters.filter((s) => playing.has(key(s.player)) || playing.has(key(s.name)));
}

// ── Picking starters ──
// One starter as the phone's sign-in and the admin check-in pop-up show it.
export interface StarterPick {
  player: string; // the name that goes on the list: the player name, else the combat name
  name: string; // combat name
  image: string; // file name in /starter-fighters/, "" if it has none
}
