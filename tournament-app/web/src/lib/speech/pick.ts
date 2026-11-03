import lines from "./lines.json";

// Picks what a fighter says in Match centre's speech bubble after scoring.
//
// lines.json holds, per starter fighter, 12 solo lines, and per pairing
// ("A|B", names sorted) a few exchanges: the scorer (`lead`) says `line`, the
// other fighter answers with `reply`. Pure: the caller keeps the `used` ids
// (per match) and passes `rand` in tests.

export type Solo = { id: string; text: string };
export type Rival = { id: string; lead: string; line: string; reply: string };
export type SpeechLines = { solo: Record<string, Solo[]>; rivals: Record<string, Rival[]> };
export type Speech = {
  lead: { fighter: string; text: string; id: string };
  reply?: { fighter: string; text: string };
};

const LINES = lines as SpeechLines;

/** How often a rival exchange is used when one is available (vs a solo line). */
export const RIVAL_CHANCE = 0.5;

const norm = (s: string) => s.trim().toLowerCase();

/** The lines.json key for a fighter name, ignoring case and spaces at the ends. */
function canonical(name: string | null, book: SpeechLines): string | null {
  if (!name) return null;
  const want = norm(name);
  if (!want) return null;
  return Object.keys(book.solo).find((k) => norm(k) === want) ?? null;
}

const pickOne = <T>(list: T[], rand: () => number): T =>
  list[Math.min(list.length - 1, Math.floor(rand() * list.length))];

/**
 * What `scorer` says after winning a round against `opponent`, or null when
 * the scorer has no lines (a custom fighter, or a player without one).
 *
 * A rival exchange led by the scorer is used about half the time when the
 * pairing has one left; otherwise a solo line. Nothing in `used` is picked
 * again until the scorer has run out, then repeats are allowed rather than
 * going quiet.
 */
export function pickSpeech(
  scorer: string | null,
  opponent: string | null,
  used: Set<string>,
  rand: () => number = Math.random,
  book: SpeechLines = LINES,
): Speech | null {
  const s = canonical(scorer, book);
  if (!s) return null;
  const soloAll = book.solo[s] ?? [];
  const o = canonical(opponent, book);
  const rivalAll =
    o && o !== s ? (book.rivals[[s, o].sort().join("|")] ?? []).filter((r) => r.lead === s) : [];
  if (!soloAll.length && !rivalAll.length) return null;

  let solo = soloAll.filter((l) => !used.has(l.id));
  let rival = rivalAll.filter((r) => !used.has(r.id));
  if (!solo.length && !rival.length) {
    // Run out: start over rather than go silent.
    solo = soloAll;
    rival = rivalAll;
  }

  const useRival = rival.length > 0 && (solo.length === 0 || rand() < RIVAL_CHANCE);
  if (useRival) {
    const r = pickOne(rival, rand);
    return { lead: { fighter: s, text: r.line, id: r.id }, reply: { fighter: o!, text: r.reply } };
  }
  const l = pickOne(solo, rand);
  return { lead: { fighter: s, text: l.text, id: l.id } };
}
