// The voice review's files, in tournament-app/voice-review/ (kept in git, so
// the history travels with the repo):
//   review.json       your marks: { "<clip url>": { status, note, at } }
//   directions.json   the direction behind a clip that was re-done (one not
//                     listed still uses its default, lib/voiceDirection.ts)
//   clips/<key>/      each clip's old versions and candidates, with log.json
//
// Used by the review page (/admin/voices, dev server only) and by
// scripts/announcer.ts, so it has no SvelteKit imports. The live clips stay
// where the app plays them, in web/static.

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";
import type { Direction } from "../voiceDirection";

export type Status = "ok" | "redo";
export interface Mark {
  status: Status | null;
  note: string;
  at: string;
}

export interface Version {
  file: string; // in the clip's folder
  at: string; // ISO time it was made (a candidate) or retired (history)
  label: string; // e.g. "Replaced", "Not picked", "Candidate"
  direction?: Direction;
}

export interface ClipLog {
  history: Version[]; // newest first
  candidates: Version[];
}

// "/starter-fighters/victorious-buzzsaw.mp3" → "starter-fighters--victorious-buzzsaw"
export function clipKey(url: string): string {
  return url.replace(/^\//, "").replace(/\.mp3$/, "").replace(/\//g, "--");
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

// A file name in `dir` that isn't taken: the time, plus -2, -3… if two files
// land in the same millisecond (a fast machine, or a test).
function freshName(dir: string, prefix: string): string {
  const base = `${prefix}${stamp()}`;
  let name = `${base}.mp3`;
  for (let n = 2; existsSync(join(dir, name)); n++) name = `${base}-${n}.mp3`;
  return name;
}

function readJson<T>(path: string, empty: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return empty;
  }
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

/** `root` is the tournament-app folder. */
export function voiceStore(root: string) {
  const base = join(root, "voice-review");
  const staticDir = join(root, "web/static");
  const reviewPath = join(base, "review.json");
  const directionsPath = join(base, "directions.json");
  const clipDir = (url: string) => join(base, "clips", clipKey(url));
  const logPath = (url: string) => join(clipDir(url), "log.json");

  const store = {
    base,
    staticDir,

    marks: (): Record<string, Mark> => readJson(reviewPath, {}),

    setMark(url: string, status: Status | null, note: string) {
      const all = store.marks();
      if (!status && !note) delete all[url];
      else all[url] = { status, note, at: new Date().toISOString() };
      writeJson(reviewPath, all);
    },

    directions: (): Record<string, Direction> => readJson(directionsPath, {}),

    // The direction behind the live clip: its own if it was re-done, else the default.
    directionFor(url: string, defaults: Map<string, Direction>): Direction | undefined {
      return store.directions()[url] ?? defaults.get(url);
    },

    log: (url: string): ClipLog => readJson(logPath(url), { history: [], candidates: [] }),

    // Move the live clip into its history before it's replaced.
    archive(url: string, label: string, direction?: Direction) {
      const live = join(staticDir, url);
      if (!existsSync(live)) return;
      mkdirSync(clipDir(url), { recursive: true });
      const file = freshName(clipDir(url), "");
      copyFileSync(live, join(clipDir(url), file));
      const log = store.log(url);
      log.history.unshift({ file, at: new Date().toISOString(), label, ...(direction ? { direction } : {}) });
      writeJson(logPath(url), log);
    },

    // A candidate for a line marked to redo, made by scripts/announcer.ts.
    addCandidate(url: string, mp3: string, direction: Direction) {
      mkdirSync(clipDir(url), { recursive: true });
      const file = freshName(clipDir(url), "candidate-");
      renameSync(mp3, join(clipDir(url), file));
      const log = store.log(url);
      log.candidates.push({ file, at: new Date().toISOString(), label: "Candidate", direction });
      writeJson(logPath(url), log);
    },

    // Make a candidate the live clip: the old live clip and the candidates not
    // picked all go into the history, the pick's direction is kept, and the
    // line is marked OK.
    pick(url: string, file: string, defaults: Map<string, Direction>) {
      const log = store.log(url);
      const chosen = log.candidates.find((c) => c.file === file);
      if (!chosen) throw new Error("That candidate isn't there any more.");
      store.archive(url, "Replaced", store.directionFor(url, defaults));
      copyFileSync(join(clipDir(url), chosen.file), join(staticDir, url));
      const after = store.log(url); // archive() added to the history
      const now = new Date().toISOString();
      after.history.splice(1, 0, { ...chosen, at: now, label: "Picked (now live)" });
      for (const c of after.candidates) if (c.file !== file) after.history.splice(2, 0, { ...c, at: now, label: "Not picked" });
      after.candidates = [];
      writeJson(logPath(url), after);
      if (chosen.direction) writeJson(directionsPath, { ...store.directions(), [url]: chosen.direction });
      store.setMark(url, "ok", store.marks()[url]?.note ?? "");
    },

    // A file in voice-review/clips, for the page to play; null if the path
    // tries to leave that folder or isn't an MP3.
    clipFile(path: string): string | null {
      const clips = join(base, "clips");
      const full = normalize(join(clips, path));
      if (!full.startsWith(clips + sep) || !full.endsWith(".mp3") || !existsSync(full)) return null;
      return full;
    },
  };
  return store;
}
