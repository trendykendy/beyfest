<script lang="ts">
  import Sprite from "./Sprite.svelte";
  import { stepPoly } from "./pixel";

  // Design 4 — JRPG message window: flat navy with an ink/gold/ink frame,
  // the speaker's name in a gold tab on the top edge, and a blinking "more"
  // arrow. No gradients anywhere.
  let { text, side, name, calm }: { text: string; side: "left" | "right"; name: string; calm: boolean } = $props();

  const L0 = stepPoly([1]);

  // Top three rows sit on the frame (inner ink, gold, outer ink) and carry
  // each band down into the tail, so the frame wraps round it.
  const TAIL = [
    "...NNNN...",
    "..KNNNNK..",
    ".GKNNNNKG.",
    "KGKNNNKGK.",
    "KGKNNKGK..",
    "KGKNKGK...",
    "KGKKGK....",
    "KGKGK.....",
    "KGGK......",
    "KGK.......",
    "KK........",
    "K.........",
  ];
  const PAL = { K: "#000", G: "#ffc700", N: "#0e1a52" };
  const ARROW = ["GGGGG", ".GGG.", "..G.."];
</script>

<div class="v4" class:calm>
  <div class="box">
    <div class="lay" style:clip-path={L0} style:background="#000"></div>
    <div class="lay i1" style:background="#ffc700"></div>
    <div class="lay i2" style:background="#000"></div>
    <div class="lay i3" style:background="#0e1a52"></div>
    {#if name}<div class="tab {side}">{name}</div>{/if}
    <p class="txt" class:named={!!name}>{text}</p>
    <div class="more {side}"><Sprite rows={ARROW} palette={PAL} /></div>
  </div>
  <div class="tail {side}"><Sprite rows={TAIL} palette={PAL} flip={side === "right"} /></div>
</div>

<style>
  .v4 {
    position: relative;
    padding-bottom: 36px;
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
  .i2 {
    inset: 8px;
  }
  .i3 {
    inset: 12px;
  }
  /* Name tab: gold, with the box-shadow pixel-border trick (four offset
     copies leave the corners notched). Sits over the top edge. */
  .tab {
    position: absolute;
    top: -22px;
    padding: 5px 12px 3px;
    background: #ffc700;
    color: #000;
    font-family: "Silkscreen", var(--font-display);
    font-weight: 700;
    font-size: 20px;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow:
      0 -4px 0 0 #000,
      0 4px 0 0 #000,
      -4px 0 0 0 #000,
      4px 0 0 0 #000;
    -webkit-font-smoothing: none;
  }
  .tab.left {
    left: 24px;
  }
  .tab.right {
    right: 24px;
  }
  .txt {
    position: relative;
    margin: 0;
    max-width: 420px;
    padding: 24px 52px 30px 30px;
    font-family: "DotGothic16", var(--font-text);
    font-size: 28px;
    line-height: 1.2;
    color: #fff;
    -webkit-font-smoothing: none;
  }
  .txt.named {
    padding-top: 30px;
  }
  .more {
    position: absolute;
    bottom: 18px;
    animation: v4-blink 700ms steps(1) infinite;
  }
  .more.left {
    right: 20px;
  }
  .more.right {
    right: 20px;
  }
  .calm .more {
    animation: none;
  }
  @keyframes v4-blink {
    50% {
      visibility: hidden;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .more {
      animation: none;
    }
  }
  .tail {
    position: absolute;
    top: calc(100% - 48px);
  }
  .tail.left {
    left: var(--tail-x);
  }
  .tail.right {
    right: var(--tail-x);
  }
</style>
