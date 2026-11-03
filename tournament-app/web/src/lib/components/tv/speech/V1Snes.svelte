<script lang="ts">
  import Sprite from "./Sprite.svelte";
  import { innerProfile, stepPoly } from "./pixel";

  // Design 1 — classic SNES dialogue box: banded navy window, white double
  // border with notched pixel corners, stepped pointer, typewriter text.
  let { text, side, calm }: { text: string; side: "left" | "right"; calm: boolean } = $props();

  const OUTER = [2, 1];
  const L0 = stepPoly(OUTER);
  const L1 = stepPoly(innerProfile(OUTER, 1));

  // One span per letter so they can appear one at a time (CSS only, so the
  // lab's ?t= freeze can stop it mid-sentence).
  const chars = $derived([...text]);

  const TAIL = ["KWWWWWK", "KWWWWK", "KWWWK", "KWWK", "KWK", "KK", "K"];
  const PAL = { K: "#05081f", W: "#eef1ff" };
</script>

<div class="v1" class:calm>
  <div class="box">
    <div class="lay" style:clip-path={L0} style:background="#05081f"></div>
    <div class="lay i1" style:clip-path={L1} style:background="#eef1ff"></div>
    <div class="lay i3" style:background="#05081f"></div>
    <div class="lay i4 fill"></div>
    <p class="txt">
      {#each chars as c, i (i)}<span style:--i={i}>{c}</span>{/each}
    </p>
  </div>
  <div class="tail {side}"><Sprite rows={TAIL} palette={PAL} flip={side === "right"} /></div>
</div>

<style>
  .v1 {
    position: relative;
    padding-bottom: 24px; /* the pointer hangs below the box */
    filter: drop-shadow(8px 8px 0 #000);
  }
  .box {
    position: relative;
  }
  .lay {
    position: absolute;
    inset: 0;
  }
  .i1 {
    inset: 4px;
  }
  .i3 {
    inset: 12px;
  }
  .i4 {
    inset: 16px;
  }
  /* A "gradient" in five hard bands, the way a 16-bit palette would do it. */
  .fill {
    background: linear-gradient(
      to bottom,
      #4a62e6 0 20%,
      #3c52d2 20% 40%,
      #3044bd 40% 60%,
      #2537a5 60% 80%,
      #1b2a8c 80% 100%
    );
  }
  .txt {
    position: relative;
    margin: 0;
    max-width: 400px;
    padding: 26px 34px 28px;
    font-family: "Pixelify Sans", var(--font-text);
    font-weight: 400;
    font-size: 30px;
    line-height: 1.2;
    color: #fff;
    text-shadow: 3px 3px 0 #05081f;
    -webkit-font-smoothing: none;
    font-smooth: never;
  }
  /* Typewriter: each letter switches on 28ms after the last, once the
     window has opened. */
  .txt span {
    animation: v1-type 1ms steps(1) both;
    animation-delay: calc(220ms + var(--i) * 28ms);
  }
  .calm .txt span {
    animation: none;
  }
  @keyframes v1-type {
    from {
      visibility: hidden;
    }
    to {
      visibility: visible;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .txt span {
      animation: none;
    }
  }
  .tail {
    position: absolute;
    top: calc(100% - 28px); /* overlaps the box's black outline row */
  }
  .tail.left {
    left: var(--tail-x);
  }
  .tail.right {
    right: var(--tail-x);
  }
</style>
