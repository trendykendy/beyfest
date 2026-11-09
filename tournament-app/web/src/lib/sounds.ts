// The TV's sounds: the match music, the announcer's calls for the VS intro
// (name, "versus", name, match title), each round's finish, the winner's
// "[name] is VICTORIOUS!", and the stinger that ends a match. Every shared
// file is on the master list in clips.ts; each fighter's name call and own
// whole calls come from the fighter library instead (fighters.ts). Some
// constant names are the 2026 ones (ROYALE, QUALIFIED …); what they say is in
// clips.ts. Only the plain logic is here, so it can be tested; the playing is
// in components/tv/announcer.ts.

import type { Stage } from "@beyfest/engine";
import {
  CHAMPION_THEME_CLIP,
  CIRCLE_CLIPS,
  DEATHS_DOOR_CLIP,
  FINISH_CLIPS,
  HEARTBEAT_CLIP,
  IMPACT_CLIP,
  MELEE_CLIPS,
  MUSIC_CLIPS,
  PATH_CLIPS,
  RECKONING_CLIP,
  STINGER_CLIP,
  VERSUS_CLIPS,
} from "./clips";

export const MUSIC = MUSIC_CLIPS.map((c) => c.url);

export const VERSUS = VERSUS_CLIPS.map((c) => c.url);
export const STINGER = STINGER_CLIP.url; // ends a match in place of a fade-out
// The stinger is the last 5.25 s of the Suno piece (which won't generate
// anything shorter), ending on its own final hit; the raw file is in
// tournament-app/music/. The end fade is only a safety net now: the clip
// has finished by the time it fires.
export const STINGER_END_MS = 5_400;
export const STINGER_END_FADE_MS = 150;
// The stinger eases in rather than cutting in: it starts at the ducked
// music's level and rises to full over this long, while the match music
// fades out underneath (a crossfade).
export const STINGER_IN_MS = 600;

// The call for a round's finish ("Banishment!"), by its key in finishes.ts;
// "" for a key it doesn't know.
export function finishClip(key: string): string {
  return FINISH_CLIPS[key]?.url ?? "";
}

// The winner's own "[name] is VICTORIOUS!" when a result goes in (one file,
// the fighter's callVictorious). A walkover wasn't a fight, so nobody is
// called; nor is a winner without the clip.
export function winsCall(victorious: string, walkover: boolean): string[] {
  return victorious && !walkover ? [victorious] : [];
}

// The match title clip, or "" when there isn't one. Group matches say their
// Circle (the engine still labels them "Group N"); knockout matches say their
// Path. Each path's mini round-robin, and the 8-player Upper and Lower
// brackets, borrow the Gilded and Ashen clips.
export function titleClip(m: { stage: Stage; roundLabel: string }): string {
  switch (m.stage) {
    case "group": {
      const n = Number(/^Group (\d+)/.exec(m.roundLabel)?.[1]);
      return CIRCLE_CLIPS[n - 1]?.url ?? "";
    }
    case "wb":
    case "ub":
    case "wb_rr":
      return PATH_CLIPS.gilded.url;
    case "lb":
    case "lb_rr":
      return PATH_CLIPS.ashen.url;
    case "mb":
      return PATH_CLIPS.iron.url;
    case "gf":
      return RECKONING_CLIP.url;
    default:
      return "";
  }
}

// A random pick that isn't the same as last time (when there's a choice).
export function pickOther<T>(list: T[], last: T | null, random = Math.random): T {
  const pool = list.length > 1 ? list.filter((x) => x !== last) : list;
  return pool[Math.floor(random() * pool.length)];
}

// When each call starts during the VS intro (ms from the intro's start), and
// when the banners should split apart. The first call lands with the banners'
// slam; the intro holds until the last call has finished, and never leaves
// sooner than it used to.
export const CALLS_START = 450; // the banners slam together
export const CALLS_GAP = 150; // breath between calls
export const CALLS_TAIL = 400; // hold after the last call
export const INTRO_OUT = 4200; // VsIntro's own exit time

export function callTimes(durations: number[]): { starts: number[]; out: number } {
  const { starts, end } = callSequence(durations, CALLS_START);
  return { starts, out: Math.max(INTRO_OUT, Math.round((durations.length ? end : 0) + CALLS_TAIL)) };
}

// Calls one after another from `from` (ms), with a breath between: when each
// starts, and when the last one has finished (`from` itself if there are none).
export function callSequence(durations: number[], from: number): { starts: number[]; end: number } {
  const starts: number[] = [];
  let t = from;
  for (const d of durations) {
    starts.push(t);
    t += d + CALLS_GAP;
  }
  return { starts, end: durations.length ? t - CALLS_GAP : from };
}

// When the stinger hits, in ms from now, given how long the announcer has
// left to talk: a breath after the last call, or straight away if it's quiet.
export function stingerDelay(talkingFor: number): number {
  return talkingFor > 0 ? talkingFor + CALLS_GAP : 0;
}

// ── Winner screen ────────────────────────────────────────────────────
// The TV's winner screen (WinnerScreen.svelte) plays on every result but the
// grand final's. The "[name] wins!" call starts with its slam; the stinger
// follows the call as usual (Announcer.endMatch). The screen then holds until
// the next match starts.
export const WINNER_SLAM = 450; // the winner's banner lands

// ── Match point ──────────────────────────────────────────────────────
// The impact as match point lands, then the heartbeat loops under the ducked
// music until the match ends. The announcer calls it over the impact's tail;
// sudden death reuses the Grand Mêlée's "Last Stand!".
export const MATCH_POINT_HIT = IMPACT_CLIP.url;
export const HEARTBEAT = HEARTBEAT_CLIP.url; // one lub-dub, padded with silence
export const HEARTBEAT_MS = 1200; // the file's length; the TV's pulse keeps time with it
export const MATCH_POINT_CALL = DEATHS_DOOR_CLIP.url;
export const SUDDEN_DEATH_CALL = MELEE_CLIPS.lastStand.url;
// How loud the impact and heartbeat play: 1 is full volume. The heartbeat
// also follows the admin page's music level; the calls aren't affected.
export const MATCH_POINT_FX_LEVEL = 0.75;
// The reverb on the match music during match point: how much is added (0 is
// none) and how long it rings, in seconds.
export const MATCH_POINT_REVERB = 1.2;
export const MATCH_POINT_REVERB_SECONDS = 2.4;

// The announcer's line for a match point moment; a save is the impact alone.
export function matchPointCalls(event: "slam" | "suddenDeath" | "saved"): string[] {
  if (event === "slam") return [MATCH_POINT_CALL];
  return event === "suddenDeath" ? [SUDDEN_DEATH_CALL] : [];
}

// ── The Grand Mêlée (battle royale) ──────────────────────────────────
// Its calls are on the list in clips.ts (MELEE_CLIPS). Until a file is
// there its call is skipped (the intro's timing allows for it). The
// champion's "… Last One Standing!" is their own clip (callRoyaleChampion).
export const ROYALE = MELEE_CLIPS.title.url; // "The Grand Mêlée!"
export const AND = MELEE_CLIPS.and.url;
export const QUALIFIED = MELEE_CLIPS.stillStanding.url;

// The Still Standing screen's call: "[A] and [B]… Still Standing!" ("A, B
// and C" for three or more, without the commas). Names with no voice clip are
// left out; with none at all it's just "Still Standing!". The call starts as
// the panels land (QUALIFIED_CALL ms in).
export const QUALIFIED_CALL = 550;
export function qualifiedCall(voices: string[]): string[] {
  const v = voices.filter(Boolean);
  if (v.length < 2) return [...v, QUALIFIED];
  return [...v.slice(0, -1), AND, v[v.length - 1], QUALIFIED];
}

// The call for a battle's name, from its key (H1…H4 skirmishes, SD the Last
// Stand, F the Final Mêlée); "" for none.
export function royaleLabelClip(key: string): string {
  const heat = /^H([1-4])$/.exec(key);
  if (heat) return MELEE_CLIPS.skirmishes[Number(heat[1]) - 1].url;
  if (key === "SD") return MELEE_CLIPS.lastStand.url;
  if (key === "F") return MELEE_CLIPS.final.url;
  return "";
}

// ── Champion ─────────────────────────────────────────────────────────
// The Champion scene's music, and its one-off call: the champion's own
// "[name] … Hero of Gyrondor!" (one file, their callChampion).
export const CHAMPION_THEME = CHAMPION_THEME_CLIP.url;

// The call lands with the scene's big reveal: ChampionScene slams the name
// slab in (with its flash and confetti) 450 ms after it comes up.
export const CHAMPION_CALL_START = 450;

// The call is only made if the scene first shows within this long of the TV
// seeing the grand final's result. After the result the TV holds Match centre
// for 20 s, then the rotation can still run through every other scene before
// it gets to Champion (groups 25 + round-robin 20 + bracket 25 + Match centre
// 15 + awards 20 s), so up to about two minutes. Three minutes covers that,
// with room for a slow data refresh, while a TV that comes back to the scene
// much later (or reloads, which never sees the result go in) stays quiet.
export const CHAMPION_FRESH_MS = 3 * 60_000;

export function championCallFresh(resultSeenAt: number, now: number): boolean {
  return now >= resultSeenAt && now - resultSeenAt <= CHAMPION_FRESH_MS;
}
