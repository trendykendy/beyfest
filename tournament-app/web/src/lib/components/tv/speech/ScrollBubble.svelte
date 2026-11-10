<script lang="ts">
  import { cubicOut } from "svelte/easing";

  // A fighter's line on the Arena: a parchment scroll that unrolls beneath
  // their portrait, like the motto ribbon under a crest. A small point on its
  // top edge aims at the speaker.
  //
  // The parent places it: put it in a box whose bottom edge is where the
  // scroll should rest and it grows upwards from there, centred. --sb-max is
  // the widest the text may run (default 520px).
  //
  // `show` unrolls it and rolls it away; or key it ({#key line}) for a new
  // line. `still` draws it finished, with no animation. With reduced motion on
  // it just appears and disappears.
  let {
    text,
    show = true,
    still = false,
  }: {
    text: string;
    show?: boolean;
    still?: boolean;
  } = $props();

  const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const calm = $derived(still || reduced());

  // Unrolls from the middle outwards; the words fade up once there's room.
  function unroll(_node: Element, { out = false } = {}) {
    if (calm) return { duration: 0 };
    return {
      duration: out ? 220 : 340,
      easing: cubicOut,
      css: (t: number) => `transform: scaleX(${0.12 + 0.88 * t}); opacity: ${Math.min(1, t * 2.5)}; --ink: ${Math.max(0, (t - 0.55) / 0.45)}`,
    };
  }
</script>

{#if show}
  <div class="scroll" in:unroll|global out:unroll|global={{ out: true }}>
    <span class="tip" aria-hidden="true"></span>
    <span class="roll l" aria-hidden="true"></span>
    <p>{text}</p>
    <span class="roll r" aria-hidden="true"></span>
  </div>
{/if}

<style>
  .scroll {
    --ink: 1;
    position: relative;
    display: flex;
    align-items: stretch;
    width: max-content;
    margin: 0 auto;
    filter: drop-shadow(0 12px 14px rgba(0, 0, 0, 0.6));
  }
  /* The sheet. */
  p {
    position: relative;
    z-index: 1;
    max-width: var(--sb-max, 520px);
    margin: 9px -6px; /* tucked a little way under the rolls */
    padding: 16px 40px 18px;
    font-family: var(--tf-font-text);
    font-style: italic;
    font-weight: 500;
    font-size: 38px;
    line-height: 1.14;
    text-align: center;
    text-wrap: balance;
    color: rgb(58 42 24 / var(--ink));
    background:
      linear-gradient(90deg, rgba(120, 84, 30, 0.28), transparent 9%, transparent 91%, rgba(120, 84, 30, 0.28)),
      linear-gradient(180deg, #f8efd6, #ecdcb0 62%, #dfc993);
    border-top: 2px solid #b8975a;
    border-bottom: 2px solid #8f7040;
  }
  /* The rolled ends: a little taller than the sheet, shaded like a cylinder. */
  .roll {
    position: relative;
    z-index: 2;
    flex: none;
    width: 26px;
    border-radius: 13px / 18px;
    background: linear-gradient(90deg, #8a6c3c, #f3e6c2 38%, #e3cf9c 58%, #7d6034);
    box-shadow:
      inset 0 0 0 2px rgba(92, 66, 28, 0.55),
      inset 0 10px 8px -6px rgba(255, 250, 230, 0.7);
  }
  /* The point up to the speaker: a corner of the sheet, behind its top edge. */
  .tip {
    position: absolute;
    left: 50%;
    top: -3px;
    z-index: 0;
    width: 28px;
    height: 28px;
    margin-left: -14px;
    transform: rotate(45deg);
    background: #f8efd6;
    border-left: 2px solid #b8975a;
    border-top: 2px solid #b8975a;
  }
</style>
