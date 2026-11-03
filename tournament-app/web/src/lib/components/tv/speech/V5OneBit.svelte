<script lang="ts">
  import Sprite from "./Sprite.svelte";
  import { stepPoly } from "./pixel";

  // Design 5 — minimal 1-bit: pure black on white, one-pixel outline with
  // notched corners, a small stepped tail and a dithered checkerboard shadow
  // (the only "shade" a 1-bit screen has).
  let { text, side }: { text: string; side: "left" | "right" } = $props();

  const L0 = stepPoly([1]);
  const TAIL = ["KWWWWK", "KWWWK", "KWWK", "KWK", "KK", "K"];
  const PAL = { K: "#000", W: "#fff" };
</script>

<div class="v5">
  <div class="box">
    <div class="lay dither" style:clip-path={L0}></div>
    <div class="lay" style:clip-path={L0} style:background="#000"></div>
    <div class="lay i1" style:background="#fff"></div>
    <p class="txt">{text}</p>
  </div>
  <div class="tail {side}"><Sprite rows={TAIL} palette={PAL} flip={side === "right"} /></div>
</div>

<style>
  .v5 {
    position: relative;
    padding-bottom: 20px;
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
  /* 50% checker dither, offset two fat pixels down-right. */
  .dither {
    transform: translate(8px, 8px);
    background: repeating-conic-gradient(#000 0 25%, transparent 0 50%) 0 0 / 8px 8px;
  }
  .txt {
    position: relative;
    margin: 0;
    max-width: 460px;
    padding: 12px 20px 14px;
    font-family: "VT323", monospace;
    font-size: 38px;
    line-height: 0.95;
    color: #000;
    -webkit-font-smoothing: none;
  }
  .tail {
    position: absolute;
    top: calc(100% - 24px);
  }
  .tail.left {
    left: var(--tail-x);
  }
  .tail.right {
    right: var(--tail-x);
  }
</style>
