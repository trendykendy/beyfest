// The master list of every sound the TV plays for Beyfest: Tetrafatalis:
// what each clip says, when it plays and where its file goes. sounds.ts takes
// every path from here, so a clip can't be used without being on this list.
// scripts/clips.ts writes the list out as fighter-art/prompts/announcer-clips.md (the list to
// commission from) and shows which files are in place.
//
// New announcer clips go in static/sounds/announcer/ under these names. Until
// a file is there, the TV skips that call without a gap (announcer.ts checks
// every clip when the TV loads). The fighter name calls are listed separately,
// from the starter fighters (static/starter-fighters/fighters.json).

import { circleName } from "./terms";

export interface Clip {
  url: string; // where the TV fetches it (under web/static)
  says: string; // the words, or what the sound is
  when: string; // when it plays
}

export interface ClipSection {
  title: string;
  note?: string;
  clips: Clip[];
}

const announcer = (name: string, says: string, when: string): Clip => ({
  url: `/sounds/announcer/${name}.mp3`,
  says,
  when,
});

// ── Announcer ────────────────────────────────────────────────────────

export const VERSUS_CLIPS = [
  announcer("versus-1", "Versus!", "VS intro, between the two names (one take at random, never twice running)"),
  announcer("versus-2", "Versus!", "The second take of the same"),
];

// Circle I–V: a group match's title, last in the VS intro.
export const CIRCLE_CLIPS = [1, 2, 3, 4, 5].map((n) =>
  announcer(`titles/circle-${n}`, `Circle ${["One", "Two", "Three", "Four", "Five"][n - 1]}!`, `VS intro of a ${circleName(n - 1)} match`),
);

// The Paths. Each path's mini round-robin uses its path's clip, and the
// 8-player Upper and Lower brackets use the Gilded and Ashen clips.
export const PATH_CLIPS = {
  gilded: announcer("titles/gilded-path", "The Gilded Path!", "VS intro of a Gilded Path match (also its round-robin and the 8-player Upper bracket)"),
  iron: announcer("titles/iron-path", "The Iron Path!", "VS intro of an Iron Path match"),
  ashen: announcer("titles/ashen-path", "The Ashen Path!", "VS intro of an Ashen Path match (also its round-robin and the 8-player Lower bracket)"),
};

export const RECKONING_CLIP = announcer("titles/the-reckoning", "The Reckoning!", "VS intro of the grand final");

// A round's finish, by its key in finishes.ts (the names are in terms.ts).
export const FINISH_CLIPS: Record<string, Clip> = {
  spin: announcer("finishes/spin", "Endurance!", "A round won by spin finish"),
  knockout: announcer("finishes/knockout", "Banishment!", "A round won by knockout"),
  dominant: announcer("finishes/dominant", "Annihilation!", "A round won by a dominant finish"),
};

export const VICTORIOUS_CLIP = announcer("victorious", "…is VICTORIOUS!", "Straight after the winner's name when a result goes in");
export const DEATHS_DOOR_CLIP = announcer("deaths-door", "Death's Door!", "Match point lands, over the impact");

// The Grand Mêlée (battle royale).
export const MELEE_CLIPS = {
  title: announcer("melee/grand-melee", "The Grand Mêlée!", "Each battle's intro, first"),
  skirmishes: [1, 2, 3, 4].map((n) =>
    announcer(`melee/skirmish-${n}`, `Skirmish ${["One", "Two", "Three", "Four"][n - 1]}!`, `After "The Grand Mêlée!" for skirmish ${n}`),
  ),
  lastStand: announcer("melee/last-stand", "Last Stand!", "The Mêlée's sudden-death battle, and a match's sudden death"),
  final: announcer("melee/final-melee", "The Final Mêlée!", "After \"The Grand Mêlée!\" for the final battle"),
  lastOneStanding: announcer("melee/last-one-standing", "…Last One Standing!", "After the Mêlée winner's name"),
  and: announcer("melee/and", "…and…", "Between the last two names on the Still Standing screen"),
  stillStanding: announcer("melee/still-standing", "…Still Standing!", "After the names of those who go through a skirmish"),
};

export const HERO_CLIP = announcer("hero-of-gyrondor", "…Hero of Gyrondor!", "After the champion's name, as the Champion scene's reveal lands");

export const ANNOUNCER: ClipSection[] = [
  { title: "VS intro", clips: VERSUS_CLIPS },
  {
    title: "Stage titles",
    note: "Said last in the VS intro: name, versus, name, title.",
    clips: [...CIRCLE_CLIPS, PATH_CLIPS.gilded, PATH_CLIPS.iron, PATH_CLIPS.ashen, RECKONING_CLIP],
  },
  { title: "Finishing blows", clips: Object.values(FINISH_CLIPS) },
  { title: "Results and match point", clips: [VICTORIOUS_CLIP, DEATHS_DOOR_CLIP] },
  {
    title: "The Grand Mêlée",
    clips: [MELEE_CLIPS.title, ...MELEE_CLIPS.skirmishes, MELEE_CLIPS.lastStand, MELEE_CLIPS.final, MELEE_CLIPS.lastOneStanding, MELEE_CLIPS.and, MELEE_CLIPS.stillStanding],
  },
  { title: "The champion", clips: [HERO_CLIP] },
];

/** Every announcer clip's URL (the name calls aren't included). */
export const ANNOUNCER_URLS: string[] = ANNOUNCER.flatMap((s) => s.clips.map((c) => c.url));

// ── Music and effects ────────────────────────────────────────────────
// The 2026 files play until the new soundtrack arrives. A replacement goes
// in under the same name (or the name changes here and in the folder).

export const MUSIC_CLIPS: Clip[] = [
  "championship-theme-1",
  "championship-theme-2",
  "championship-mode",
  "championship-theme-3",
  "championship-theme-4",
  "championship-theme-5",
].map((name) => ({
  url: `/sounds/music/${name}.mp3`,
  says: "Match music (instrumental)",
  when: "Under every match from its VS intro, one track at random, never twice running; the next starts when one ends",
}));

export const STINGER_CLIP: Clip = {
  url: "/sounds/stinger.mp3",
  says: "Stinger, about 5 s, ending on a final hit",
  when: "Ends a match, crossfading out of the match music",
};
export const CHAMPION_THEME_CLIP: Clip = {
  url: "/sounds/champion-theme.mp3",
  says: "Champion theme (instrumental, loops)",
  when: "Under the Champion scene",
};
export const IMPACT_CLIP: Clip = {
  url: "/sounds/match-point-impact.mp3",
  says: "A heavy impact",
  when: "Match point lands (Death's Door)",
};
export const HEARTBEAT_CLIP: Clip = {
  url: "/sounds/heartbeat.mp3",
  says: "One heartbeat (lub-dub), padded with silence to exactly 1.2 s",
  when: "Loops under the ducked music during match point",
};
export const PROLOGUE_CLIP: Clip = {
  url: "/intro/narration.m4a",
  says: "The Prologue narration (script still to be written)",
  when: "The organiser's Prologue on the TV; the captions are timed to its words, so they're redone with it",
};

export const MUSIC_AND_EFFECTS: ClipSection = {
  title: "Music, effects and narration",
  note: "The 2026 files play until these are replaced. A new file goes in under the same name.",
  clips: [...MUSIC_CLIPS, STINGER_CLIP, CHAMPION_THEME_CLIP, IMPACT_CLIP, HEARTBEAT_CLIP, PROLOGUE_CLIP],
};
