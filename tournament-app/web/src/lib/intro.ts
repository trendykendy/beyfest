// The Beyfest 2026 intro: a 67-second anime-style prelude for the TV, set to
// the narrated monologue (static/intro/narration.m4a). The storyboard is in
// fighter-art/INTRO-STORYBOARD.md.
//
// Everything on screen is a pure function of the audio's clock, `t` in ms, so
// the scene can't drift from the narration and the lab page can scrub to any
// moment. This module holds the timing and the camera; IntroScene draws it.

export const AUDIO = "/intro/narration.m4a";
export const DURATION = 66_840;

// When each word lands (ms), from Whisper's word timings on the audio file.
export const CUE = {
  dawn: 3_820,
  eight: 6_520,
  champion: 9_860,
  battled: 11_920,
  cracked: 12_980,
  sparked: 13_980,
  stood: 15_900,
  overAll: 16_600,
  theBreycist: 18_440,
  coldWinds: 21_560,
  newChallengers: 23_720,
  butOnce: 26_640,
  vanquished: 30_920,
  crown: 34_380,
  nighOn: 36_380,
  onceAgain: 39_120,
  ten: 40_120,
  cord: 41_720,
  bey: 42_240,
  canThe: 46_420,
  stopped: 47_520,
  victory: 50_160,
  beyfest: 53_880,
  year: 54_480,
  triple: 56_420,
  threat: 57_220,
} as const;

// The shots, in order (version 2 of the storyboard: generated scenes, not
// cut-outs): when each starts, and how long it takes to fade in over the one
// before. The one before stays underneath until the fade is done.
export const SHOTS = [
  ["cold", 0, 0],
  ["eight", 2_400, 900], // B1 from black, then E1: the first eight arrive
  ["final", 10_700, 900], // P1: Breycist vs Underdogger
  ["clash", 12_750, 250], // C1, quick, in time for "cracked"
  ["overAll", 15_000, 900], // S1: one stood over all
  ["winter", 20_500, 1_000], // B2, then W1: the new challengers
  ["denied", 26_200, 900], // P2: Breycist vs Buzzsaw
  ["crown", 32_000, 900], // R2
  ["year", 36_800, 800], // B3: a year passes
  ["g1", 37_700, 800],
  ["g2", 39_700, 800],
  ["cord", 41_500, 300], // C2, quick, in time for "cord"
  ["g3", 42_900, 700],
  ["newBlood", 44_500, 700], // N1, held through "Can the Breycist be stopped"
  ["stopped", 48_100, 800], // R3
  ["title", 53_300, 1_000],
] as const;
export type Shot = (typeof SHOTS)[number][0];

// The newest shot on screen at `t`, with its start and the next one's.
export function shotAt(t: number): { shot: Shot; start: number; end: number } {
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i][1]) i--;
  return { shot: SHOTS[i][0], start: SHOTS[i][1], end: i + 1 < SHOTS.length ? SHOTS[i + 1][1] : DURATION };
}

// When a shot is on screen at all: from its start until the next shot has
// finished fading in over it.
export function shotSpan(shot: Shot): { start: number; until: number } {
  const i = SHOTS.findIndex(([s]) => s === shot);
  const next = SHOTS[i + 1];
  return { start: SHOTS[i][1], until: next ? next[1] + next[2] : DURATION };
}

// Every shot on screen at `t` (two during a fade), oldest first, each with
// its opacity. The newer one fades in on top, so the picture never dips.
export function visibleShots(t: number): { shot: Shot; opacity: number }[] {
  return SHOTS.filter(([shot]) => {
    const { start, until } = shotSpan(shot);
    return t >= start && t < until;
  }).map(([shot, start, fade]) => ({ shot, opacity: fade ? easeSine(prog(t, start, fade)) : 1 }));
}

// ── Timing helpers ──────────────────────────────────────────────────

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
// 0 before `from`, 1 after `from + ms`, linear in between.
export const prog = (t: number, from: number, ms: number) => clamp((t - from) / ms);
export const easeOut = (p: number) => 1 - (1 - p) ** 3;
export const easeIn = (p: number) => p ** 3;
// Overshoots a little, then settles: for things slamming into place.
export const easeBack = (p: number) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;
// A flash: 1 at `at`, gone `ms` later.
export const flash = (t: number, at: number, ms = 300) => (t < at ? 0 : 1 - prog(t, at, ms));
// A screen shake's offset in px at `t`, for a hit at `at`.
export function shake(t: number, at: number, px = 16, ms = 380): [number, number] {
  if (t < at || t > at + ms) return [0, 0];
  const p = (t - at) / ms;
  const amp = px * (1 - p);
  return [Math.sin(p * 47) * amp, Math.cos(p * 39) * amp * 0.6];
}

// ── Camera ──────────────────────────────────────────────────────────

// A camera framing on a picture: the point (as fractions of the picture's
// width and height) at the middle of the screen, and the zoom (1 = the
// picture just covers the 1920×1080 screen).
export type Frame = { x: number; y: number; zoom: number };

// The CSS transform that shows `frame` of a picture whose box is the picture
// scaled to cover the screen (`boxW` × `boxH`, origin top left). It's clamped
// so the picture always covers the screen, whatever the framing asks for.
export function frameTransform(f: Frame, boxW: number, boxH: number): string {
  const w = boxW * f.zoom;
  const h = boxH * f.zoom;
  const left = clamp(960 - f.x * w, 1920 - w, 0);
  const top = clamp(540 - f.y * h, 1080 - h, 0);
  return `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) scale(${f.zoom.toFixed(4)})`;
}

// Between two framings, `p` (0–1) of the way.
export const between = (a: Frame, b: Frame, p: number): Frame => ({
  x: lerp(a.x, b.x, p),
  y: lerp(a.y, b.y, p),
  zoom: lerp(a.zoom, b.zoom, p),
});
// Gently slow at both ends: for fades and the slow camera drifts.
export function easeSine(p: number) {
  return (1 - Math.cos(Math.PI * p)) / 2;
}

// Every scene is 3:2, so its box is 1920×1280.
export const BOX_W = 1920;
export const BOX_H = 1280;

// Whether a framing can move freely: it doesn't push the picture's edge onto
// the screen, so frameTransform never has to clamp it. A move between two free
// framings keeps moving all the way, rather than stopping dead at an edge.
export function frameFree(f: Frame, boxW = BOX_W, boxH = BOX_H): boolean {
  const halfW = 960 / (boxW * f.zoom);
  const halfH = 540 / (boxH * f.zoom);
  const e = 1e-9;
  return f.zoom >= 1 && f.x >= halfW - e && f.x <= 1 - halfW + e && f.y >= halfH - e && f.y <= 1 - halfH + e;
}

// The camera on each shot: a slow Ken Burns drift, at a steady speed, from
// the first framing to the second across the whole time the shot is on
// screen, fades included, so nothing stops moving while it fades. B1 and E1
// share the "eight" camera (E1 is an edit of B1, so they line up), as B2 and
// W1 share "winter". Every framing is free (frameFree), so no move hits an edge.
export const CAMERA: Partial<Record<Shot, [Frame, Frame]>> = {
  eight: [{ x: 0.5, y: 0.56, zoom: 1.04 }, { x: 0.5, y: 0.58, zoom: 1.16 }],
  final: [{ x: 0.43, y: 0.4, zoom: 1.2 }, { x: 0.57, y: 0.4, zoom: 1.22 }], // the Underdogger across to the Breycist
  clash: [{ x: 0.5, y: 0.5, zoom: 1.04 }, { x: 0.5, y: 0.5, zoom: 1.14 }],
  overAll: [{ x: 0.5, y: 0.48, zoom: 1.12 }, { x: 0.5, y: 0.41, zoom: 1.04 }], // tilts up to the Breycist
  winter: [{ x: 0.5, y: 0.46, zoom: 1.02 }, { x: 0.5, y: 0.42, zoom: 1.12 }],
  denied: [{ x: 0.52, y: 0.5, zoom: 1.08 }, { x: 0.44, y: 0.44, zoom: 1.2 }],
  crown: [{ x: 0.5, y: 0.45, zoom: 1.02 }, { x: 0.53, y: 0.37, zoom: 1.16 }],
  year: [{ x: 0.5, y: 0.5, zoom: 1.02 }, { x: 0.5, y: 0.5, zoom: 1.08 }],
  g1: [{ x: 0.45, y: 0.42, zoom: 1.16 }, { x: 0.55, y: 0.42, zoom: 1.18 }],
  g2: [{ x: 0.55, y: 0.45, zoom: 1.16 }, { x: 0.45, y: 0.45, zoom: 1.18 }],
  cord: [{ x: 0.5, y: 0.52, zoom: 1.04 }, { x: 0.5, y: 0.56, zoom: 1.18 }],
  g3: [{ x: 0.5, y: 0.44, zoom: 1.04 }, { x: 0.5, y: 0.42, zoom: 1.14 }],
  newBlood: [{ x: 0.5, y: 0.44, zoom: 1.04 }, { x: 0.55, y: 0.38, zoom: 1.16 }], // in towards his grin
  stopped: [{ x: 0.5, y: 0.46, zoom: 1.02 }, { x: 0.5, y: 0.42, zoom: 1.16 }],
  title: [{ x: 0.5, y: 0.5, zoom: 1 }, { x: 0.5, y: 0.5, zoom: 1.06 }],
};

// Where the camera on `shot` is at `t`.
export function cameraAt(shot: Shot, t: number): Frame {
  const [a, b] = CAMERA[shot]!;
  const { start, until } = shotSpan(shot);
  return between(a, b, prog(t, start, until - start));
}

// Every image the intro shows, so the page can load them before it plays.
export const INTRO_IMAGES = [
  "b1-dawn", "b2-winter", "b3-night", "c1-clash", "c2-ripcord", "r2-crown", "r3-menace",
  "e1-eight", "p1-first-final", "s1-stood-over-all", "w1-challengers", "p2-winter-final",
  "g1-group", "g2-group", "g3-pair", "n1-new-blood",
  "logo-1-beyfest", "logo-2-year", "logo-3-triple-threat",
].map((n) => `/intro/${n}.webp`);
export const introImages = () => INTRO_IMAGES;
