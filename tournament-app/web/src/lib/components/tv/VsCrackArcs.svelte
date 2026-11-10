<script lang="ts">
  import { onMount } from "svelte";

  // Gold arcs crawling along the VS crack, drawn on a canvas over it: every
  // 55ms a fresh set of 4–6 jagged bolts, each following a random stretch of
  // the crack, so no shape ever repeats. Ported from the locked style frame
  // (fighter-art/style-frames/vs-slam, "gold fierce").
  type Point = [number, number];

  let {
    crack,
    top,
    bottom,
    start = 650,
    slow = 1,
  }: {
    crack: Point[]; // the crack, top to bottom, in canvas px
    top: number; // the band the arcs are clipped to
    bottom: number;
    start?: number; // ms after mount: just after the slam
    slow?: number;
  } = $props();

  const W = 1920;
  const H = 1080;
  const FRAME = 55; // ms one set of bolts lasts
  const ARCS = [4, 6]; // bolts per set
  const LEN = [0.12, 0.32]; // each bolt's share of the crack
  const ROUGH = 41; // how far a kink can wander
  const WIDTH = [2.2, 3.8]; // core stroke width
  const GLOW = "#ff8a1e";
  const MID = "#ffd27a";
  const CORE = "#ffffff";

  let canvas: HTMLCanvasElement;
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  // Each stretch of the crack with where it starts along the whole, so a
  // position (0 to 1) can be turned into a point.
  // svelte-ignore state_referenced_locally
  const segs = (() => {
    let at = 0;
    return crack.slice(1).map((p, i) => {
      const from = crack[i];
      const len = Math.hypot(p[0] - from[0], p[1] - from[1]);
      const s = { from, to: p, len, at };
      at += len;
      return s;
    });
  })();
  const total = segs.reduce((n, s) => n + s.len, 0);

  function along(t: number): Point {
    const d = Math.max(0, Math.min(1, t)) * total;
    const s = segs.find((s) => d <= s.at + s.len) ?? segs[segs.length - 1];
    const k = (d - s.at) / s.len;
    return [s.from[0] + (s.to[0] - s.from[0]) * k, s.from[1] + (s.to[1] - s.from[1]) * k];
  }

  // The crack between two positions, corners included.
  function between(t1: number, t2: number): Point[] {
    const pts = [along(t1)];
    for (const s of segs) {
      const end = (s.at + s.len) / total;
      if (end > t1 && end < t2) pts.push(s.to);
    }
    pts.push(along(t2));
    return pts;
  }

  // A jagged bolt from a to b: midpoints pushed sideways, four times over.
  function bolt(a: Point, b: Point): Point[] {
    let pts = [a, b];
    for (let d = 0; d < 4; d++) {
      const next: Point[] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x1, y1] = pts[i];
        const [x2, y2] = pts[i + 1];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const l = Math.hypot(dx, dy) || 1;
        const off = (Math.random() - 0.5) * ROUGH * (l / 72);
        next.push([(x1 + x2) / 2 - (dy / l) * off, (y1 + y2) / 2 + (dx / l) * off], pts[i + 1]);
      }
      pts = next;
    }
    return pts;
  }

  function boltAlong(line: Point[]): Point[] {
    const out: Point[] = [];
    for (let i = 0; i < line.length - 1; i++) out.push(...bolt(line[i], line[i + 1]).slice(i ? 1 : 0));
    return out;
  }

  // One bolt, as a wide orange glow, a gold middle and a white core.
  function stroke(ctx: CanvasRenderingContext2D, pts: Point[], w: number, alpha: number) {
    for (const [width, op, colour] of [
      [w * 4, 0.5, GLOW],
      [w * 1.8, 0.8, MID],
      [w, 1, CORE],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
      ctx.lineWidth = width;
      ctx.globalAlpha = op * alpha;
      ctx.strokeStyle = colour;
      ctx.stroke();
    }
  }

  function drawSet(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top, W, bottom - top);
    ctx.clip();
    ctx.lineJoin = "bevel";
    ctx.lineCap = "round";
    const n = Math.round(rnd(ARCS[0], ARCS[1]));
    for (let i = 0; i < n; i++) {
      const t1 = rnd(0.05, 0.85);
      const t2 = Math.min(0.97, t1 + rnd(LEN[0], LEN[1]));
      stroke(ctx, boltAlong(between(t1, t2)), rnd(WIDTH[0], WIDTH[1]), rnd(0.6, 1));
    }
    ctx.restore();
  }

  onMount(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let last = 0;
    const began = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - began < start * slow) return;
      if (now - last < FRAME * slow) return;
      last = now;
      drawSet(ctx);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  });
</script>

<canvas class="arcs" bind:this={canvas} width={W} height={H}></canvas>

<style>
  .arcs {
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 1080px;
    pointer-events: none;
  }
</style>
