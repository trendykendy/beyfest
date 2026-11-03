<script lang="ts" module>
  export type BubbleSide = "left" | "right";
  export type BubbleVariant = 1 | 2 | 3 | 4 | 5;
  export const BUBBLE_DESIGNS: Record<BubbleVariant, string> = {
    1: "SNES dialogue",
    2: "Pixel cloud",
    3: "Arcade shout",
    4: "JRPG name tab",
    5: "1-bit minimal",
  };
</script>

<script lang="ts">
  import V1Snes from "./V1Snes.svelte";
  import V2Cloud from "./V2Cloud.svelte";
  import V3Shout from "./V3Shout.svelte";
  import V4Jrpg from "./V4Jrpg.svelte";
  import V5OneBit from "./V5OneBit.svelte";
  import { reducedMotion, stepped } from "./pixel";

  // A pixel-art speech bubble hanging over a fighter's art panel.
  //
  // Drop it inside a `position: relative` box (on the TV: .mc-card). The
  // tail's tip lands --pb-anchor in from that box's outer edge (the left
  // edge for side="left", the right edge for side="right") and --pb-gap
  // above its top. Both are CSS custom properties set by the parent.
  //
  // `show` pops it in and out; or key it ({#key line}) to pop a new line.
  // `still` draws it finished, with no animation (for side-by-side sheets).
  let {
    text,
    side = "left",
    name = "",
    variant = 1,
    show = true,
    still = false,
  }: {
    text: string;
    side?: BubbleSide;
    name?: string;
    variant?: BubbleVariant;
    show?: boolean;
    still?: boolean;
  } = $props();

  const calm = $derived(still || reducedMotion());

  // Each design has its own entrance, all on held frames (steps), never a
  // smooth ease, so they read as sprite animation.
  function pop(_node: Element, { out = false } = {}) {
    if (calm) return { duration: 0 };
    switch (variant) {
      case 1: // window opens top-to-bottom like a SNES text box
        return { duration: out ? 150 : 200, css: (t: number) => `transform: scaleY(${stepped(t, 4)})` };
      case 2: // springy pop with an overshoot
        return {
          duration: out ? 160 : 280,
          css: (t: number) => {
            if (out) return `transform: scale(${stepped(t, 3)})`;
            const q = stepped(t, 5);
            const s = q < 0.6 ? (q / 0.6) * 1.18 : 1.18 - ((q - 0.6) / 0.4) * 0.18;
            return `transform: scale(${s})`;
          },
        };
      case 3: // slams in oversized, then the shake keyframes take over
        return {
          duration: out ? 140 : 200,
          css: (t: number) => {
            if (out) return `transform: scale(${stepped(t, 2)})`;
            const q = stepped(t, 3);
            return `transform: scale(${q < 0.67 ? q * 2 : 1.35 - (q - 0.67) * 1.06})`;
          },
        };
      case 4: // unfolds sideways, then down
        return {
          duration: out ? 180 : 300,
          css: (t: number) => {
            const q = stepped(t, 6);
            const x = Math.min(1, q * 2);
            const y = q < 0.5 ? 0.12 : 0.12 + (q - 0.5) * 1.76;
            return `transform: scale(${x}, ${y})`;
          },
        };
      default: // blinks on, like a sprite flickering in
        return {
          duration: out ? 200 : 300,
          css: (t: number) => {
            const frames = [0, 1, 0, 1, 0, 1];
            return `opacity: ${t >= 1 ? 1 : frames[Math.floor(t * 6)]}`;
          },
        };
    }
  }
</script>

{#if show}
  <div class="pb-anchor {side}">
    <div class="pb v{variant} {side}" in:pop|global out:pop|global={{ out: true }}>
      {#if variant === 1}<V1Snes {text} {side} {calm} />
      {:else if variant === 2}<V2Cloud {text} {side} />
      {:else if variant === 3}<V3Shout {text} {side} {calm} />
      {:else if variant === 4}<V4Jrpg {text} {side} {name} {calm} />
      {:else}<V5OneBit {text} {side} />{/if}
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
  .pb.v1 {
    --tail-x: 34px;
  }
  .pb.v2 {
    --tail-x: 22px;
  }
  .pb.v3 {
    --tail-x: 40px;
  }
  .pb.v4 {
    --tail-x: 38px;
  }
  .pb.v5 {
    --tail-x: 30px;
  }
</style>
