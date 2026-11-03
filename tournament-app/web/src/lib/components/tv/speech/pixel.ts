// Helpers for the pixel-art speech bubbles. Everything is drawn on a grid of
// U-pixel "fat pixels", so edges come out stepped like 16-bit sprites rather
// than smooth.

/** One fat pixel on the 1920×1080 TV canvas. */
export const U = 4;

/**
 * A clip-path polygon for a box with stepped ("pixel rounded") corners.
 * `profile[k]` is how many fat pixels row k (counted in from the corner) is
 * cut in by, e.g. [2, 1] is the classic two-step corner. Built from
 * `calc(100% - …)` so it fits any box size.
 */
export function stepPoly(profile: number[], u = U): string {
  const n = profile.length;
  const px = (v: number) => `${v * u}px`;
  const fromEnd = (v: number) => (v === 0 ? "100%" : `calc(100% - ${v * u}px)`);
  const pts: string[] = [];
  const at = (x: string, y: string) => pts.push(`${x} ${y}`);
  // top edge → top-right corner, stepping down
  for (let k = 0; k < n; k++) {
    at(fromEnd(profile[k]), px(k));
    at(fromEnd(profile[k]), px(k + 1));
  }
  at("100%", px(n));
  // right edge → bottom-right corner, stepping in
  at("100%", fromEnd(n));
  for (let k = n - 1; k >= 0; k--) {
    at(fromEnd(profile[k]), fromEnd(k + 1));
    at(fromEnd(profile[k]), fromEnd(k));
  }
  // bottom edge → bottom-left corner, stepping up
  for (let k = 0; k < n; k++) {
    at(px(profile[k]), fromEnd(k));
    at(px(profile[k]), fromEnd(k + 1));
  }
  at("0", fromEnd(n));
  // left edge → top-left corner
  at("0", px(n));
  for (let k = n - 1; k >= 0; k--) {
    at(px(profile[k]), px(k + 1));
    at(px(profile[k]), px(k));
  }
  return `polygon(${pts.join(", ")})`;
}

/** True when the viewer asked for less motion (bubbles then just appear). */
export function reducedMotion(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
