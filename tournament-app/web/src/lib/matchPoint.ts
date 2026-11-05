// Match point: a blader one point short of the target. A finish is worth 1–3
// points, so a round can land on match point or jump straight past it to a
// win; matches can end without ever reaching it. The betting book closes on
// the same rule, so the phones and the TV always agree.

export type MatchPointState = "none" | "p1" | "p2" | "both" | "decided";
export type MatchPointEvent = "slam" | "suddenDeath" | "saved";

export function matchPointState(p1: number, p2: number, target: number): MatchPointState {
  if (p1 >= target || p2 >= target) return "decided";
  const p1On = p1 === target - 1;
  const p2On = p2 === target - 1;
  if (p1On && p2On) return "both";
  if (p1On) return "p1";
  if (p2On) return "p2";
  return "none";
}

// What a change of score means for the room, if anything:
//   slam         someone has just reached match point
//   suddenDeath  both bladers are now one point away
//   saved        the blader behind scored and survived a match point
// A score going down (Undo, a correction) never fires anything.
export function matchPointEvent(
  before: [number, number],
  after: [number, number],
  target: number,
): MatchPointEvent | null {
  const scored = after[0] > before[0] || after[1] > before[1];
  const dropped = after[0] < before[0] || after[1] < before[1];
  if (!scored || dropped) return null;

  const was = matchPointState(before[0], before[1], target);
  const now = matchPointState(after[0], after[1], target);
  if (now === "decided" || now === "none") return null;
  if (now === "both") return was === "both" ? null : "suddenDeath";
  if (was === "none") return "slam";
  return was === now ? "saved" : null;
}
