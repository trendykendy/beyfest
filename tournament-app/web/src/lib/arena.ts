// Side helpers for the TV's Arena (Match centre) and VS intro.
// The portraits stay put for the whole match: round one's North player is on
// the left. Each round's North/South (gem and engraving) follows that round's
// draw, so it can swap while the portraits don't move.
import type { MatchPointState } from "./matchPoint";

// Which player (1 or 2) goes on the left: round one's North player (from the
// first round's log once it's played, else the side drawn for the round about
// to start), or p1 if sides weren't drawn.
export function leftSide(m: { liveLog: { north?: 1 | 2 }[]; north: 0 | 1 | 2 }): 1 | 2 {
  return m.liveLog[0]?.north || m.north || 1;
}

// This round's side for one player, or "" when sides weren't drawn.
export function sideOf(m: { north: 0 | 1 | 2 }, which: 1 | 2): "North" | "South" | "" {
  if (!m.north) return "";
  return m.north === which ? "North" : "South";
}

// Match point in screen order: "p1" means the left portrait, "p2" the right.
// When p2 is on the left, p1 and p2 swap; the rest don't depend on sides.
export function mpToLR(mp: MatchPointState, left: 1 | 2): MatchPointState {
  if (left === 1) return mp;
  if (mp === "p1") return "p2";
  if (mp === "p2") return "p1";
  return mp;
}
