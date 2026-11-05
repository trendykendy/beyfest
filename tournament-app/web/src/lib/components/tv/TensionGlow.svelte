<script lang="ts">
  import type { MatchPointState } from "$lib/matchPoint";
  import { HEARTBEAT_MS } from "$lib/sounds";

  // The backdrop for match point: the room darkens and the colour of whoever
  // is on match point pulses with the heartbeat. It goes behind the Match
  // centre, so the fighters and scores stay in front of it. (The rest of the
  // moment is UltimateFinish, which goes over the Match centre.)
  let { mp = "none" }: { mp?: MatchPointState } = $props();
  const on = $derived(mp === "p1" || mp === "p2" || mp === "both");
</script>

{#if on}
  <div class="glow who-{mp}" style:--beat="{HEARTBEAT_MS}ms">
    <div class="dim"></div>
    <div class="edge l"></div>
    <div class="edge r"></div>
  </div>
{/if}

<style>
  .glow {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .dim {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 62% 56% at 50% 47%, transparent 40%, rgb(0 0 0 / 0.62) 100%);
    animation: fade-in 500ms linear both;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  .edge {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 42%;
    opacity: 0;
  }
  .edge.l {
    left: 0;
    background: linear-gradient(90deg, rgb(255 32 44 / 0.5), transparent);
  }
  .edge.r {
    right: 0;
    background: linear-gradient(270deg, rgb(70 175 255 / 0.5), transparent);
  }
  .who-p1 .edge.l,
  .who-p2 .edge.r,
  .who-both .edge {
    animation: heartbeat var(--beat) linear infinite;
  }
  /* Lub-dub, in time with heartbeat.mp3 (thumps at about 40 and 360 ms of its
     1200). It never drops far, so it reads as a pulse rather than a flash. */
  @keyframes heartbeat {
    0% {
      opacity: 0.45;
    }
    3.5% {
      opacity: 1;
    }
    18% {
      opacity: 0.6;
    }
    30% {
      opacity: 0.85;
    }
    65%,
    100% {
      opacity: 0.45;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .edge {
      animation: none !important;
      opacity: 0.6;
    }
  }
</style>
