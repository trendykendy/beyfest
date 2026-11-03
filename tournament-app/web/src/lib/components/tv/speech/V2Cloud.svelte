<script lang="ts">
  import Sprite from "./Sprite.svelte";
  import { innerProfile, stepPoly } from "./pixel";

  // Design 2 — chunky pixel cloud: white balloon, fat 2-pixel black outline
  // with big stepped corners, a swept comic tail.
  let { text, side }: { text: string; side: "left" | "right" } = $props();

  const OUTER = [7, 5, 3, 2, 2, 1, 1];
  const L0 = stepPoly(OUTER);
  const L1 = stepPoly(innerProfile(OUTER, 2));

  // Tip bottom-left; the top two rows sit on the balloon's outline and
  // punch the white through it so the tail and balloon read as one shape.
  const TAIL = [
    "....KKWWWWKK",
    "....KKWWWWKK",
    "...KKWWWWKK.",
    "...KKWWWKK..",
    "..KKWWWKK...",
    "..KKWWKK....",
    ".KKWWKK.....",
    ".KKWKK......",
    "KKWKK.......",
    "KKKK........",
    "KK..........",
  ];
  const PAL = { K: "#000", W: "#fff" };
</script>

<div class="v2">
  <div class="box">
    <div class="lay" style:clip-path={L0} style:background="#000"></div>
    <div class="lay i2" style:clip-path={L1} style:background="#fff"></div>
    <p class="txt">{text}</p>
  </div>
  <div class="tail {side}"><Sprite rows={TAIL} palette={PAL} flip={side === "right"} /></div>
</div>

<style>
  .v2 {
    position: relative;
    padding-bottom: 36px;
    filter: drop-shadow(8px 8px 0 #0a1240);
  }
  .box {
    position: relative;
  }
  .lay {
    position: absolute;
    inset: 0;
  }
  .i2 {
    inset: 8px;
  }
  .txt {
    position: relative;
    margin: 0;
    max-width: 400px;
    padding: 26px 40px 28px;
    font-family: "Pixelify Sans", var(--font-text);
    font-weight: 700;
    font-size: 30px;
    line-height: 1.15;
    color: #000;
    text-align: center;
    text-wrap: balance;
    -webkit-font-smoothing: none;
  }
  .tail {
    position: absolute;
    top: calc(100% - 44px);
  }
  .tail.left {
    left: var(--tail-x);
  }
  .tail.right {
    right: var(--tail-x);
  }
</style>
