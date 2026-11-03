<script lang="ts" module>
  export type BubbleSide = "left" | "right";
</script>

<script lang="ts">
  import V5OneBit from "./V5OneBit.svelte";
  import { reducedMotion } from "./pixel";

  // A pixel-art speech bubble (the "1-bit minimal" design) hanging over a
  // fighter's art panel.
  //
  // Drop it inside a `position: relative` box (on the TV: .mc-card). The
  // tail's tip lands --pb-anchor in from that box's outer edge (the left
  // edge for side="left", the right edge for side="right") and --pb-gap
  // above its top. Both are CSS custom properties set by the parent, as are
  // two optional ones: --pb-tail-x, how far the tip sits in from the bubble's
  // near edge (default 30px; bigger pushes the bubble out past the anchor),
  // and --pb-max, the bubble's widest (default 460px).
  //
  // `show` pops it in and out; or key it ({#key line}) to pop a new line.
  // `still` draws it finished, with no animation (for side-by-side sheets).
  // With reduced motion on it just appears and disappears.
  let {
    text,
    side = "left",
    show = true,
    still = false,
  }: {
    text: string;
    side?: BubbleSide;
    show?: boolean;
    still?: boolean;
  } = $props();

  const calm = $derived(still || reducedMotion());

  // Blinks on, like a sprite flickering in: held frames, never a smooth ease.
  function pop(_node: Element, { out = false } = {}) {
    if (calm) return { duration: 0 };
    return {
      duration: out ? 200 : 300,
      css: (t: number) => {
        const frames = [0, 1, 0, 1, 0, 1];
        return `opacity: ${t >= 1 ? 1 : frames[Math.floor(t * 6)]}`;
      },
    };
  }
</script>

{#if show}
  <div class="pb-anchor {side}">
    <div class="pb {side}" in:pop|global out:pop|global={{ out: true }}>
      <V5OneBit {text} {side} />
    </div>
  </div>
{/if}

<style>
  /* A zero-size point where the tail's tip touches. */
  .pb-anchor {
    position: absolute;
    bottom: calc(100% + var(--pb-gap, 10px));
    width: 0;
    height: 0;
    z-index: 6;
    pointer-events: none;
  }
  .pb-anchor.left {
    left: var(--pb-anchor, 95px);
  }
  .pb-anchor.right {
    right: var(--pb-anchor, 95px);
  }
  /* The bubble hangs up from the anchor, shifted so its tail tip is on it.
     --tail-x is how far in from the bubble's near edge the tip sits. */
  .pb {
    --tail-x: var(--pb-tail-x, 30px);
    position: absolute;
    bottom: 0;
    width: max-content;
  }
  .pb.left {
    left: calc(-1 * var(--tail-x));
    transform-origin: var(--tail-x) 100%;
  }
  .pb.right {
    right: calc(-1 * var(--tail-x));
    transform-origin: calc(100% - var(--tail-x)) 100%;
  }
</style>
