// The three ways to score a round (from the Beyfest 2026 rules brief).
// A match is played round by round; each round is won by one of these, and
// points accumulate until a blader reaches the match target (5 / 7 / 9).
import { FINISH_NAMES } from "./terms";

export interface Finish {
  key: string;
  label: string;
  desc: string;
  pts: number;
}

// `label` is the in-world name (terms.ts); `desc` stays plain so the organiser
// can tell which real-world finish each button means. `key` is stored in
// liveLog and names the finish audio files, so it never changes.
export const FINISHES: Finish[] = [
  { key: "spin", label: FINISH_NAMES.spin, desc: "last bey spinning", pts: 1 },
  { key: "knockout", label: FINISH_NAMES.knockout, desc: "ring-out", pts: 2 },
  { key: "dominant", label: FINISH_NAMES.dominant, desc: "stadium finish", pts: 3 },
];

// Largest single-round swing — used to bound a valid final score.
export const MAX_FINISH = Math.max(...FINISHES.map((f) => f.pts));
