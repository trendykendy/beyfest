<script lang="ts">
  import { onMount } from "svelte";

  // Electric arcs leaping off the VS seam, drawn on a canvas over the solid
  // bolt: thin jagged strands, new shapes every 50ms, in bursts with short
  // gaps. The timing is deliberately uneven, because a steady rhythm reads as
  // a flicker rather than a spark.
  type Point = [number, number];

  let {
    seam,
    top,
    bottom,
    slow = 1,
  }: {
    seam: Point[];
    top: number; // the band the arcs are clipped to
    bottom: number;
    slow?: number;
  } = $props();

  const W = 1920;
  const H = 1080;
  const START = 470; // ms: just after the slam
  const REDRAW = 50; // ms: how long one set of strands lasts

  let canvas: HTMLCanvasElement;

  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  // The seam's total length, and each stretch's share of it, so a position
  // along the seam (0 to 1) can be turned into a point.
  const stretches = $derived(
    seam.slice(1).map((p, i) => ({ from: seam[i], to: p, len: Math.hypot(p[0] - seam[i][0], p[1] - seam[i][1]) })),
  );
  const seamLen = $derived(stretches.reduce((sum, s) => sum + s.len, 0));

  function pointAt(pos: number): Point {
    let d = Math.min(1, Math.max(0, pos)) * seamLen;
    for (const s of stretches) {
      if (d <= s.len) {
        const f = d / s.len;
        return [s.from[0] + (s.to[0] - s.from[0]) * f, s.from[1] + (s.to[1] - s.from[1]) * f];
      }
      d -= s.len;
    }
    return seam[seam.length - 1];
  }

  // The seam's direction at a position, as a unit vector.
  function dirAt(pos: number): Point {
    const [ax, ay] = pointAt(pos - 0.01);
    const [bx, by] = pointAt(pos + 0.01);
    const l = Math.hypot(bx - ax, by - ay) || 1;
    return [(bx - ax) / l, (by - ay) / l];
  }

  // A jagged line from one point to another: each kink pushes sideways by up
  // to `rough`, tapering to nothing at both ends.
  function jag(ctx: CanvasRenderingContext2D, a: Point, b: Point, steps: number, rough: number) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    ctx.moveTo(a[0], a[1]);
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const j = rnd(-rough, rough) * Math.sin(f * Math.PI);
      ctx.lineTo(a[0] + dx * f - (dy / l) * j, a[1] + dy * f + (dx / l) * j);
    }
  }

  // Bursts of activity split by short gaps of quiet.
  function burstClock() {
    let active = true;
    let until = 0;
    return (now: number) => {
      if (now >= until) {
        active = !active;
        until = now + (active ? rnd(120, 420) : rnd(40, 170)) * slow;
      }
      return active;
    };
  }

  type Strand = { a: number; b: number; rough: number; bow: number; width: number };

  function newStrands(on: boolean) {
    const strands: Strand[] = [];
    const count = on ? Math.round(rnd(4, 9)) : 1;
    for (let i = 0; i < count; i++) {
      const a = Math.random();
      // The bow carries the strand out past the bolt's white glow; on top of
      // the bolt, white lines don't show.
      const bow = rnd(60, on ? 170 : 90) * (Math.random() < 0.5 ? -1 : 1);
      strands.push({ a, b: a + rnd(0.08, 0.3), rough: rnd(12, on ? 40 : 20), bow, width: rnd(2.5, 5) });
    }
    return strands;
  }

  function drawStrand(ctx: CanvasRenderingContext2D, s: Strand) {
    const steps = 5;
    // Follows the seam round its corners, bowed out and kinked along the way.
    const bowed = (i: number): Point => {
      const pos = s.a + ((s.b - s.a) * i) / steps;
      const [x, y] = pointAt(pos);
      const [dx, dy] = dirAt(pos);
      const out = s.bow * Math.sin((i / steps) * Math.PI);
      return [x - dy * out, y + dx * out];
    };
    ctx.lineWidth = s.width;
    ctx.beginPath();
    let prev = bowed(0);
    for (let i = 1; i <= steps; i++) {
      const next = bowed(i);
      jag(ctx, prev, next, 3, s.rough);
      prev = next;
    }
    ctx.stroke();
  }

  onMount(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isOn = burstClock();
    const startAt = performance.now() + START * slow;
    let strands: Strand[] = [];
    let last = -Infinity;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#fff";

    let frame = requestAnimationFrame(function step(now) {
      frame = requestAnimationFrame(step);
      // Clear outside the save below: the clear must not run under the blur,
      // blend or clip, which made frames many times slower.
      ctx.clearRect(0, 0, W, H);
      if (now < startAt) return;
      const on = isOn(now);
      if (now - last >= REDRAW * slow) {
        last = now;
        strands = newStrands(on); // each set lasts one redraw, so no shape repeats
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, W, bottom - top);
      ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "#a8dcff";
      ctx.shadowBlur = 14;
      for (const s of strands) drawStrand(ctx, s);
      ctx.restore();
    });
    return () => cancelAnimationFrame(frame);
  });
</script>

<canvas class="arc" bind:this={canvas} width={W} height={H}></canvas>

<style>
  .arc {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
