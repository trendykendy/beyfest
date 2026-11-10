<script lang="ts">
  import { onMount } from "svelte";
  import { artFor } from "$lib/fighters";
  import FighterSilhouette from "./FighterSilhouette.svelte";
  import VsCrackArcs from "./VsCrackArcs.svelte";
  import RuneRing from "./RuneRing.svelte";

  // The fighter intro on Start match, in the Tetrafatalis look (locked style
  // frame: fighter-art/style-frames/vs-slam on tetrafatalis/art). A ruby half
  // (left) and a sapphire half (right) slam together on a jagged molten-gold
  // crack between full-width gold bars; a rune circle bursts on impact, VS
  // stamps down on a dark gold medallion ringed with turning runes, and gold
  // arcs crawl along the crack over a slow, uneven throb until the halves
  // split apart again. The slam, shake, flash and stamp keep 2026's timing.
  //
  // Everything is laid out on a fixed 1920×1080 canvas, scaled to fit, so the
  // crack's coordinates are the same at any screen size. Every duration and
  // delay in the CSS is multiplied by --k (the `slow` prop).
  //
  // p1 is the left (ruby) fighter, p2 the right (sapphire). The TV puts round
  // one's North player on the left; `sides` labels them North and South.
  // img: the cut-out's URL ("" for the silhouette). Cut-outs face left;
  // mirror flips one that faces the other way. imgMirrored: a hand-made
  // mirror image, shown instead of flipping (artFor).
  type Fighter = { name: string; kana?: string; img: string; imgMirrored?: string; mirror?: boolean };
  let {
    p1,
    p2,
    title = "", // where the match sits, e.g. matchContext(): "Circle II, match 3 of 6"
    sides = false, // label the left fighter North and the right South
    slow = 1, // timing multiplier: 2 = half speed (lab only)
    hold = false, // stay on the held frame instead of leaving (lab only)
    out = 4200, // ms: when the halves split apart (later while the announcer talks)
    ondone,
  }: {
    p1: Fighter;
    p2: Fighter;
    title?: string;
    tier?: string; // (unused: the Tetrafatalis title has one style for every path)
    sides?: boolean;
    slow?: number;
    hold?: boolean;
    out?: number;
    ondone?: () => void;
  } = $props();

  // Timeline (ms at normal speed). Keep in step with the CSS delays below.
  // Fixed for the intro's life: it's timed once, when it starts.
  // svelte-ignore state_referenced_locally
  const OUT = out; // halves split apart
  const END = OUT + 600; // gone; ondone fires
  const ENERGY = 650; // arcs and throb start, just after the slam

  // The halves fill a band across the screen, edged by the gold bars.
  const BAND_TOP = 134;
  const BAND_BOT = 888;
  const BAND_H = BAND_BOT - BAND_TOP;

  // The crack, top to bottom of the band, in band coordinates (y from the
  // band's top). Both halves are clipped to it, so they interlock exactly.
  const CRACK: [number, number][] = [
    [1032, 0],
    [960, 118],
    [1002, 217],
    [924, 335],
    [996, 436],
    [912, 570],
    [960, 653],
    [888, BAND_H],
  ];
  const pts = CRACK.map(([x, y]) => `${x}px ${y}px`).join(", ");
  const clipLeft = `polygon(0 0, ${pts}, 0 ${BAND_H}px)`;
  const clipRight = `polygon(1920px 0, ${pts}, 1920px ${BAND_H}px)`;
  const crackPath = "M" + CRACK.map(([x, y]) => `${x} ${y}`).join(" L");
  // The same crack on the whole canvas, for the arcs.
  const crackOnCanvas = CRACK.map(([x, y]) => [x, y + BAND_TOP] as [number, number]);

  let w = $state(1920);
  const scale = $derived(w / 1920);

  // The throb: the crack swells and fades unevenly (each swell 1.2–2.3s,
  // each peak a little different), so it never settles into a beat.
  let throbGlow: SVGPathElement;
  let throbCore: SVGPathElement;

  onMount(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const swell = () => {
      const dur = (1200 + Math.random() * 1100) * slow;
      const peak = 0.5 + Math.random() * 0.25;
      const width = 48 + Math.random() * 12;
      throbGlow?.animate(
        [
          { opacity: 0.2, strokeWidth: 34 },
          { opacity: peak, strokeWidth: width, offset: 0.4 + Math.random() * 0.2 },
          { opacity: 0.2, strokeWidth: 34 },
        ],
        { duration: dur, easing: "ease-in-out" },
      );
      throbCore?.animate([{ opacity: 0.08 }, { opacity: peak * 0.75, offset: 0.5 }, { opacity: 0.08 }], {
        duration: dur,
        easing: "ease-in-out",
      });
      timers.push(setTimeout(swell, dur + Math.random() * 250 * slow));
    };
    timers.push(setTimeout(swell, 900 * slow));
    if (!hold) timers.push(setTimeout(() => ondone?.(), END * slow));
    return () => timers.forEach(clearTimeout);
  });
</script>

{#snippet half(side: "l" | "r", f: Fighter)}
  <div class="half {side}" style:clip-path={side === "l" ? clipLeft : clipRight}>
    <div class="dust"></div>
    <!-- The left fighter is turned to face right; a fighter's mirror flag flips that. -->
    {#if f.img}
      {@const art = artFor(f, (side === "l") !== !!f.mirror)}
      <img class="art" class:flip={art.flip} src={art.src} alt="" />
    {:else}
      <div class="art sil"><FighterSilhouette flip={side === "l"} /></div>
    {/if}
  </div>
{/snippet}

<!-- Name plates sit outside the halves' clip, under the bottom bar. -->
{#snippet plate(side: "l" | "r", f: Fighter)}
  <div class="plate {side}" class:long={f.name.length > 16}>
    {f.name}
    {#if sides}<small>{side === "l" ? "North" : "South"}</small>{/if}
  </div>
{/snippet}

<div class="vs" class:hold bind:clientWidth={w} style:--k={slow} style:--out="{OUT}ms">
  <div class="canvas" style:transform="scale({scale})">
    <div class="backdrop"></div>
    <div class="cam">
      {@render half("l", p1)}
      {@render half("r", p2)}

      <svg class="crack" viewBox="0 0 1920 {BAND_H}" aria-hidden="true">
        <defs>
          <linearGradient id="vs-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff3c4" />
            <stop offset=".5" stop-color="#f0b84a" />
            <stop offset="1" stop-color="#b8731f" />
          </linearGradient>
          <filter id="vs-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <path class="glow draw" d={crackPath} pathLength="1" />
        <path class="gold draw" d={crackPath} pathLength="1" />
        <path class="core draw" d={crackPath} pathLength="1" />
        <g class="energy">
          <path class="throb" d={crackPath} bind:this={throbGlow} />
          <path class="throb inner" d={crackPath} bind:this={throbCore} />
        </g>
      </svg>
      <div class="energy arcs">
        <VsCrackArcs crack={crackOnCanvas} top={BAND_TOP} bottom={BAND_BOT} start={ENERGY} {slow} />
      </div>

      <div class="bar top"></div>
      <div class="bar bot"></div>

      <!-- One rune-circle burst on impact. -->
      <svg class="flare" viewBox="0 0 200 200" aria-hidden="true">
        <g fill="none" stroke="currentColor">
          <polygon points="100,24 176,100 100,176 24,100" stroke-width="1" />
          <polygon points="46,46 154,46 154,154 46,154" stroke-width="1" />
          {#each [[84, 100], [116, 100], [100, 84], [100, 116]] as [cx, cy]}
            <circle {cx} {cy} r="20" stroke-width="1.2" />
          {/each}
        </g>
        <RuneRing r={87} size={13} circles={[97, 77]} />
      </svg>

      <div class="medallion">
        <svg class="band" viewBox="0 0 200 200" aria-hidden="true">
          <RuneRing r={89} size={12} circles={[98, 80]} />
        </svg>
        <span>VS</span>
      </div>

      {@render plate("l", p1)}
      {@render plate("r", p2)}

      {#if title}
        <div class="title">{title}</div>
      {/if}
    </div>
    <div class="flash"></div>
  </div>
</div>

<style>
  .vs {
    position: absolute;
    inset: 0;
    overflow: hidden;
    /* Mottled stone over the halves: one tile as big as a half, so no seams. */
    --mottle: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='760'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0 0 0 -0.3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23m)'/%3E%3C/svg%3E");
  }
  .canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 1080px;
    transform-origin: 0 0;
    font-family: var(--tf-font-text);
    color: #f3e6c4;
  }
  .cam {
    position: absolute;
    inset: 0;
  }

  /* Behind everything: night-blue stone, fading in and out with the intro. */
  .backdrop {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 80% at 50% 55%, #1d2235, #0a0c13 75%);
    animation: fade-in calc(160ms * var(--k)) linear both;
  }
  .vs:not(.hold) .backdrop {
    animation:
      fade-in calc(160ms * var(--k)) linear both,
      fade-out calc(250ms * var(--k)) linear calc(var(--out) * var(--k) + 350ms * var(--k)) forwards;
  }

  /* ── The halves ─────────────────────────────────────────── */
  .half {
    --lite: #e9b75a; /* the silhouette's rim light: gold */
    position: absolute;
    left: 0;
    top: 134px;
    width: 1920px;
    height: 754px;
    overflow: hidden;
  }
  .half.l {
    background: var(--mottle), linear-gradient(100deg, rgb(150 24 40 / 0.75), rgb(26 16 28 / 0.96) 54%);
    animation:
      slam-l calc(450ms * var(--k)) cubic-bezier(0.3, 1.25, 0.55, 1) both,
      out-l calc(450ms * var(--k)) cubic-bezier(0.6, 0, 0.9, 0.5) calc(var(--out) * var(--k)) forwards;
  }
  .half.r {
    background: var(--mottle), linear-gradient(260deg, rgb(34 74 175 / 0.75), rgb(14 18 36 / 0.96) 54%);
    animation:
      slam-r calc(450ms * var(--k)) cubic-bezier(0.3, 1.25, 0.55, 1) both,
      out-r calc(450ms * var(--k)) cubic-bezier(0.6, 0, 0.9, 0.5) calc(var(--out) * var(--k)) forwards;
  }
  .hold .half.l {
    animation: slam-l calc(450ms * var(--k)) cubic-bezier(0.3, 1.25, 0.55, 1) both;
  }
  .hold .half.r {
    animation: slam-r calc(450ms * var(--k)) cubic-bezier(0.3, 1.25, 0.55, 1) both;
  }
  @keyframes slam-l {
    from {
      transform: translateX(-105%);
    }
  }
  @keyframes slam-r {
    from {
      transform: translateX(105%);
    }
  }
  @keyframes out-l {
    to {
      transform: translateX(-105%);
    }
  }
  @keyframes out-r {
    to {
      transform: translateX(105%);
    }
  }

  /* Floating gold dust behind the fighters, drifting up. */
  .dust {
    position: absolute;
    inset: 0;
    opacity: 0.55;
    mix-blend-mode: screen;
    background-image:
      radial-gradient(circle, rgb(255 220 160 / 0.9) 0 2.3px, transparent 3.8px),
      radial-gradient(circle, rgb(255 220 160 / 0.6) 0 1.5px, transparent 2.7px);
    background-size:
      172px 212px,
      116px 134px;
    animation: dust calc(18s * var(--k)) linear infinite;
  }
  @keyframes dust {
    from {
      background-position:
        0 0,
        58px 77px;
    }
    to {
      background-position:
        172px -848px,
        174px -459px;
    }
  }

  /* The fighters: big action shots that zoom out slowly from the slam on. */
  .art {
    position: absolute;
    bottom: -173px;
    height: 1037px;
    width: auto;
    transform-origin: 50% 70%;
    animation: drift calc(6s * var(--k)) cubic-bezier(0.2, 0.6, 0.4, 1) calc(300ms * var(--k)) both;
  }
  .l .art {
    left: -269px;
  }
  .r .art {
    right: -77px;
  }
  .art.flip {
    transform: scaleX(-1);
  }
  .art.sil {
    height: auto;
    width: 1150px;
    bottom: -60px;
  }
  .l .art.sil {
    left: -120px;
  }
  .r .art.sil {
    right: -60px;
  }
  @keyframes drift {
    from {
      scale: 1.1;
    }
    to {
      scale: 1;
    }
  }

  /* ── The crack ──────────────────────────────────────────── */
  /* Clipped to the band, so its ends tuck under the gold bars. */
  .crack {
    position: absolute;
    left: 0;
    top: 134px;
    width: 1920px;
    height: 754px;
    overflow: hidden;
    pointer-events: none;
  }
  .crack path {
    fill: none;
    stroke-linejoin: bevel;
  }
  .crack .glow {
    stroke: #ff9426;
    stroke-width: 26;
    opacity: 0.55;
    filter: url(#vs-soft);
  }
  .crack .gold {
    stroke: url(#vs-gold);
    stroke-width: 8;
  }
  .crack .core {
    stroke: #fffbe8;
    stroke-width: 2.4;
  }
  /* It tears down the band just before the halves land. */
  .crack .draw {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: draw calc(130ms * var(--k)) ease-out calc(330ms * var(--k)) forwards;
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  .crack .throb {
    stroke: #ffb347;
    stroke-width: 34;
    opacity: 0.2;
    filter: url(#vs-soft);
  }
  .crack .throb.inner {
    stroke: #fff1c4;
    stroke-width: 12;
    opacity: 0.08;
  }
  /* The arcs and the throb: hidden until just after the hit. */
  .energy {
    opacity: 0;
    animation: fade-in calc(300ms * var(--k)) calc(600ms * var(--k)) forwards;
  }
  .arcs {
    position: absolute;
    inset: 0;
  }
  .vs:not(.hold) .crack,
  .vs:not(.hold) .arcs {
    animation: fade-out calc(200ms * var(--k)) linear calc(var(--out) * var(--k)) forwards;
  }
  .vs:not(.hold) .arcs {
    animation:
      fade-in calc(300ms * var(--k)) calc(600ms * var(--k)) forwards,
      fade-out calc(200ms * var(--k)) linear calc(var(--out) * var(--k)) forwards;
  }

  /* ── The hit: bars, shake, burst, flash ─────────────────── */
  .bar {
    position: absolute;
    left: 0;
    right: 0;
    height: 10px;
    background: #f0c366;
    box-shadow: 0 0 23px #ffad3d;
    transform: scaleX(0);
    animation: bar calc(250ms * var(--k)) ease-out calc(450ms * var(--k)) forwards;
  }
  .bar.top {
    top: 129px;
  }
  .bar.bot {
    top: 883px;
  }
  @keyframes bar {
    to {
      transform: none;
    }
  }
  .vs:not(.hold) .bar {
    animation:
      bar calc(250ms * var(--k)) ease-out calc(450ms * var(--k)) forwards,
      bar-out calc(300ms * var(--k)) ease-in calc(var(--out) * var(--k) + 150ms * var(--k)) forwards;
  }
  @keyframes bar-out {
    from {
      transform: none;
    }
    to {
      transform: scaleX(0);
    }
  }

  .cam {
    animation: shake calc(450ms * var(--k)) linear calc(450ms * var(--k));
  }
  @keyframes shake {
    15% {
      transform: translate(-23px, 12px);
    }
    30% {
      transform: translate(19px, -10px);
    }
    45% {
      transform: translate(-13px, 6px);
    }
    62% {
      transform: translate(9px, -4px);
    }
    80% {
      transform: translate(-4px, 0);
    }
  }

  .flare {
    position: absolute;
    left: 960px;
    top: 511px;
    width: 653px;
    height: 653px;
    margin: -326px 0 0 -326px;
    color: #ffd98a;
    opacity: 0;
    filter: drop-shadow(0 0 19px #ff9d2e);
    pointer-events: none;
    animation: burst calc(900ms * var(--k)) ease-out calc(450ms * var(--k)) both;
  }
  @keyframes burst {
    0% {
      transform: scale(0.5);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    100% {
      transform: scale(1.6);
      opacity: 0;
    }
  }

  .flash {
    position: absolute;
    inset: 0;
    background: #fff6dc;
    opacity: 0;
    pointer-events: none;
    animation: flash calc(500ms * var(--k)) calc(450ms * var(--k)) both;
  }
  @keyframes flash {
    0% {
      opacity: 0;
    }
    12% {
      opacity: 0.8;
    }
    100% {
      opacity: 0;
    }
  }

  /* ── VS on its medallion ────────────────────────────────── */
  .medallion {
    position: absolute;
    left: 960px;
    top: 511px;
    width: 480px;
    height: 480px;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
    animation: stamp calc(360ms * var(--k)) cubic-bezier(0.2, 1.6, 0.4, 1) calc(600ms * var(--k)) forwards;
  }
  .vs:not(.hold) .medallion {
    animation:
      stamp calc(360ms * var(--k)) cubic-bezier(0.2, 1.6, 0.4, 1) calc(600ms * var(--k)) forwards,
      medallion-out calc(260ms * var(--k)) cubic-bezier(0.6, 0, 0.9, 0.5) calc(var(--out) * var(--k)) forwards;
  }
  @keyframes stamp {
    0% {
      transform: translate(-50%, -50%) scale(2.8);
      opacity: 0;
    }
    55% {
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }
  @keyframes medallion-out {
    from {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    to {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
    }
  }
  /* The rune band round it, turning slowly. */
  .band {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    color: #e9b75a;
    opacity: 0.8;
    filter: drop-shadow(0 0 10px rgb(255 157 46 / 0.7));
    animation: spin calc(24s * var(--k)) linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  /* The dark disc, rimmed in gold. */
  .medallion::before {
    content: "";
    position: absolute;
    inset: 17%;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 40%, #241a12, #07060a 75%);
    box-shadow:
      0 0 0 9px #e5b452,
      0 0 0 14px #5a3a12,
      0 0 58px 19px rgb(0 0 0 / 0.85),
      0 0 77px rgb(255 150 40 / 0.45);
  }
  .medallion span {
    position: relative;
    font-family: var(--tf-font-display);
    font-size: 161px;
    line-height: 1;
    margin-top: 12px;
    color: #fff1cc;
    text-shadow:
      0 0 15px #ffb347,
      0 5px 0 #3a1d05;
  }

  /* ── Names ──────────────────────────────────────────────── */
  .plate {
    position: absolute;
    bottom: 46px;
    font-family: var(--tf-font-display);
    font-size: 84px;
    letter-spacing: 0.05em;
    line-height: 1;
    white-space: nowrap;
    color: #ffe6ad;
    animation: rise calc(350ms * var(--k)) ease-out calc(860ms * var(--k)) both;
  }
  .plate.long {
    font-size: 66px;
  }
  .plate.l {
    left: 77px;
  }
  .plate.r {
    right: 77px;
    text-align: right;
    animation-delay: calc(920ms * var(--k));
  }
  .plate small {
    display: block;
    font-family: var(--tf-font-text);
    font-size: 33px;
    letter-spacing: 0.2em;
    font-variant: small-caps;
    margin-top: 12px;
  }
  .plate.l small {
    color: #d98a8a;
  }
  .plate.r small {
    color: #8aa6d9;
  }
  /* The side's gem: a ruby (North) or a sapphire (South). */
  .plate small::before {
    content: "";
    display: inline-block;
    width: 21px;
    height: 21px;
    margin-right: 15px;
    transform: rotate(45deg) translateY(-3px);
  }
  .plate.l small::before {
    background: linear-gradient(135deg, #ff9a9a, #c1121f 50%, #5c0610);
    box-shadow: 0 0 15px rgb(220 30 40 / 0.8);
  }
  .plate.r small::before {
    background: linear-gradient(135deg, #9ac0ff, #1f4fc1 50%, #0a1d5c);
    box-shadow: 0 0 15px rgb(40 90 230 / 0.8);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(38px);
    }
  }
  /* Leaving: each name goes with its half. */
  .vs:not(.hold) .plate.l {
    animation:
      rise calc(350ms * var(--k)) ease-out calc(860ms * var(--k)) both,
      out-l calc(450ms * var(--k)) cubic-bezier(0.6, 0, 0.9, 0.5) calc(var(--out) * var(--k)) forwards;
  }
  .vs:not(.hold) .plate.r {
    animation:
      rise calc(350ms * var(--k)) ease-out calc(920ms * var(--k)) both,
      out-r calc(450ms * var(--k)) cubic-bezier(0.6, 0, 0.9, 0.5) calc(var(--out) * var(--k)) forwards;
  }

  /* ── Match title ────────────────────────────────────────── */
  .title {
    position: absolute;
    top: 36px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 40px;
    letter-spacing: 0.22em;
    font-variant: small-caps;
    color: #e9cf8e;
    animation: fade-in calc(400ms * var(--k)) calc(1150ms * var(--k)) both;
  }
  .vs:not(.hold) .title {
    animation:
      fade-in calc(400ms * var(--k)) calc(1150ms * var(--k)) both,
      fade-out calc(300ms * var(--k)) linear calc(var(--out) * var(--k)) forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }
</style>
