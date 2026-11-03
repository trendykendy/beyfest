<script lang="ts">
  import { staircase } from "./pixel";

  // Design 3 — arcade "SHOUT" burst: a jagged gold starburst with a black
  // pixel outline, one spike stretched down to the fighter as the tail,
  // bold caps, and a shake as it lands. For the hype lines.
  let { text, side, calm }: { text: string; side: "left" | "right"; calm: boolean } = $props();

  let w = $state(0);
  let h = $state(0);

  const M = 80; // room around the text for the spikes (SVG overflow)
  const TIP_X = 40; // = PixelBubble's --tail-x for this design
  const DROP = 64; // how far below the text the tail's tip reaches

  // The burst as a polygon: spikes round an ellipse, the one nearest the
  // fighter pulled down to the tip, then snapped to the pixel staircase.
  function burst(grow: number, tipDrop: number): string {
    const cx = w / 2 + M;
    const cy = h / 2 + M;
    const rx = w / 2 + 16 + grow;
    const ry = h / 2 + 14 + grow;
    const n = Math.max(14, Math.round((w + h) / 46)) * 2;
    const jit = [1, 0.7, 1.2, 0.85, 1.05, 0.65, 1.15, 0.9];
    const tip: [number, number] = [(side === "left" ? TIP_X : w - TIP_X) + M, h + M + tipDrop];
    const tipAng = Math.atan2((tip[1] - cy) / ry, (tip[0] - cx) / rx);
    const pts: [number, number][] = [];
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const spike = i % 2 === 0;
      const d = spike ? 20 * jit[(i / 2) % jit.length] : -2;
      pts.push([cx + (rx + d) * Math.cos(a), cy + (ry + d) * Math.sin(a)]);
      if (spike) {
        const diff = Math.abs(Math.atan2(Math.sin(a - tipAng), Math.cos(a - tipAng)));
        if (diff < bestD) {
          bestD = diff;
          best = i;
        }
      }
    }
    pts[best] = tip;
    return staircase(pts);
  }

  const outline = $derived(w ? burst(8, DROP) : "");
  const fill = $derived(w ? burst(0, DROP - 12) : "");
</script>

<div class="v3" class:calm style:--drop="{DROP}px">
  {#if outline}
    <svg
      class="burst"
      width={w + 2 * M}
      height={h + 2 * M + DROP}
      shape-rendering="crispEdges"
      aria-hidden="true"
      style:left="{-M}px"
      style:top="{-M}px"
    >
      <polygon points={outline} fill="#000" transform="translate(8 8)" />
      <polygon points={outline} fill="#000" />
      <polygon points={fill} fill="var(--gold, #ffc700)" />
    </svg>
  {/if}
  <p class="txt" bind:clientWidth={w} bind:clientHeight={h}>{text}</p>
</div>

<style>
  .v3 {
    position: relative;
    padding-bottom: var(--drop);
    animation: v3-shake 420ms steps(1) 200ms both;
  }
  .calm {
    animation: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .v3 {
      animation: none;
    }
  }
  /* A few held frames of judder, a fat pixel or two each way. */
  @keyframes v3-shake {
    0% {
      transform: translate(-8px, 4px);
    }
    15% {
      transform: translate(8px, -4px);
    }
    30% {
      transform: translate(-4px, -4px);
    }
    45% {
      transform: translate(4px, 4px);
    }
    60% {
      transform: translate(-4px, 0);
    }
    75% {
      transform: translate(4px, 0);
    }
    90%,
    100% {
      transform: none;
    }
  }
  .burst {
    position: absolute;
    overflow: visible;
  }
  .txt {
    position: relative;
    margin: 0;
    max-width: 480px;
    padding: 4px 6px;
    font-family: "Press Start 2P", var(--font-display);
    font-size: 20px;
    line-height: 1.45;
    text-transform: uppercase;
    text-align: center;
    text-wrap: balance;
    color: #000;
    -webkit-font-smoothing: none;
  }
</style>
