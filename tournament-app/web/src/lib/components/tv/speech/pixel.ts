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

/**
 * The corner profile of the box `b` fat pixels inside one with `profile`, so
 * an outline drawn as "outer layer minus inner layer" stays b thick around
 * the steps too (not thin on the diagonal).
 */
export function innerProfile(profile: number[], b: number): number[] {
  const at = (i: number) => profile[i] ?? 0;
  const out: number[] = [];
  for (let k = 0; k < profile.length; k++) {
    // Inner row k sits level with outer row k+b. A pixel is inside the
    // outline when every pixel within b steps (up/down/left/right, not
    // diagonally) is inside the outer box, which gives the classic sprite
    // outline: b thick on the flats, a clean single step on the corners.
    let m = 0;
    for (let d = -b; d <= b; d++) m = Math.max(m, at(k + b + d) - Math.abs(d));
    out.push(m);
  }
  while (out.length && out[out.length - 1] === 0) out.pop();
  return out;
}

/** Quantise 0..1 into `n` held frames: the steps() look for JS transitions. */
export const stepped = (t: number, n: number) => (t >= 1 ? 1 : Math.floor(t * n) / n);

/**
 * Turn a polygon into a pixel staircase: every edge becomes 1-fat-pixel
 * horizontal/vertical moves on the u grid. Returns an SVG points string.
 */
export function staircase(points: [number, number][], u = U): string {
  const snap = (v: number) => Math.round(v / u) * u;
  const out: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    const n = Math.max(1, Math.round(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / u));
    let py = snap(ay);
    if (i === 0) out.push([snap(ax), py]);
    for (let s = 1; s <= n; s++) {
      const x = snap(ax + ((bx - ax) * s) / n);
      const y = snap(ay + ((by - ay) * s) / n);
      out.push([x, py], [x, y]);
      py = y;
    }
  }
  // Drop repeats so the path stays small.
  const clean = out.filter((p, i) => i === 0 || p[0] !== out[i - 1][0] || p[1] !== out[i - 1][1]);
  return clean.map((p) => `${p[0]},${p[1]}`).join(" ");
}

/** True when the viewer asked for less motion (bubbles then just appear). */
export function reducedMotion(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
