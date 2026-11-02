<script lang="ts">
  // Particles for the intro, drawn on a canvas as a pure function of `t`
  // (ms), so scrubbing in the lab shows exactly what playback shows.
  // Every particle's path comes from a seeded random number, not from
  // stepping a simulation.
  //   snow   drifts down and sideways (the Winter League)
  //   embers rise and flicker (the Breycist's red, the title's gold)
  //   sparks burst out from (x, y) at `at` and fall away
  //   haze   big soft blobs drifting (the dawn); skipped in lite
  type Kind = "snow" | "embers" | "sparks" | "haze";
  let {
    t,
    kind,
    count = 120,
    colour = "#ff5a2a",
    at = 0, // sparks: when they burst; others: when they start
    x = 960,
    y = 540,
    opacity = 1,
    lite = false,
  }: {
    t: number;
    kind: Kind;
    count?: number;
    colour?: string;
    at?: number;
    x?: number;
    y?: number;
    opacity?: number;
    lite?: boolean;
  } = $props();

  const W = 1920;
  const H = 1080;
  let canvas: HTMLCanvasElement;

  // A small seeded generator (mulberry32): particle i always gets the same numbers.
  function rand(seed: number) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The Pi gets a third of the particles.
  const n = $derived(lite ? Math.ceil(count / 3) : count);
  const parts = $derived(
    Array.from({ length: n }, (_, i) => {
      const r = rand(i * 7919 + kind.length * 104729);
      return { a: r(), b: r(), c: r(), d: r(), e: r() };
    }),
  );

  $effect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (kind === "haze" && lite) return;
    const s = Math.max(0, t - at) / 1000; // seconds since it started
    ctx.globalAlpha = opacity;
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;

    for (const p of parts) {
      if (kind === "snow") {
        const speed = 90 + p.c * 160;
        const py = ((p.b * (H + 40) + s * speed) % (H + 40)) - 20;
        const px = ((p.a * (W + 200) + s * (60 + p.d * 80) + Math.sin(s * (0.8 + p.e) + p.a * 9) * 30) % (W + 200)) - 100;
        const size = 1.5 + p.e * 4;
        ctx.globalAlpha = opacity * (0.5 + p.d * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "embers") {
        const speed = 40 + p.c * 110;
        const py = H + 20 - ((p.b * (H + 40) + s * speed) % (H + 40));
        const px = p.a * W + Math.sin(s * (0.6 + p.e) + p.d * 9) * 40;
        const flicker = 0.5 + 0.5 * Math.sin(s * (3 + p.e * 5) + p.a * 20);
        ctx.globalAlpha = opacity * flicker * (0.4 + p.d * 0.6);
        ctx.fillRect(px, py, 2 + p.e * 3, 2 + p.e * 3);
      } else if (kind === "sparks") {
        const life = 0.5 + p.e * 0.6; // seconds
        if (t < at || s > life) continue;
        const angle = p.a * Math.PI * 2;
        const v = 500 + p.b * 1400; // px/s
        const px = x + Math.cos(angle) * v * s;
        const py = y + Math.sin(angle) * v * s + 900 * s * s; // gravity
        const len = 10 + p.c * 30;
        ctx.globalAlpha = opacity * (1 - s / life);
        ctx.lineWidth = 2 + p.d * 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - Math.cos(angle) * len, py - (Math.sin(angle) * len + 900 * s * 0.04));
        ctx.stroke();
      } else {
        const px = ((p.a * W + s * (10 + p.c * 25)) % (W + 400)) - 200;
        const py = H * 0.35 + p.b * H * 0.5 + Math.sin(s * 0.3 + p.d * 6) * 30;
        const rad = 120 + p.e * 220;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, colour);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = opacity * (0.08 + p.d * 0.1);
        ctx.fillStyle = g;
        ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      }
    }
    ctx.globalAlpha = 1;
  });
</script>

<canvas bind:this={canvas} width={W} height={H}></canvas>

<style>
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
</style>
