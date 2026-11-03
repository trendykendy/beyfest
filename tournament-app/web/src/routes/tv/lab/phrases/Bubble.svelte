<script lang="ts">
  // Placeholder pixel speech bubble for the review lab. The designer's real
  // bubble (src/lib/components/tv/speech/) gets swapped in here later; keep the
  // props to `text` and `side` so the swap is one import.
  let { text, side = "left" }: { text: string; side?: "left" | "right" } = $props();
</script>

<div class="bubble" class:right={side === "right"}>
  <span class="text">{text}</span>
  <span class="tail" aria-hidden="true"></span>
</div>

<style>
  /* A stepped (pixel) border: no rounded corners, the corners notched out by
     a 4px step drawn with box-shadows. */
  .bubble {
    --px: 4px;
    position: relative;
    display: inline-block;
    max-width: 22em;
    margin: var(--px) var(--px) calc(var(--px) * 4);
    padding: 8px 14px;
    background: #fff;
    color: #000;
    font: 600 17px/1.25 var(--font-text);
    box-shadow:
      0 calc(var(--px) * -1) 0 0 #000,
      0 var(--px) 0 0 #000,
      calc(var(--px) * -1) 0 0 0 #000,
      var(--px) 0 0 0 #000,
      0 calc(var(--px) * 2) 0 0 rgb(0 0 0 / 0.35);
  }
  /* The tail is pixel art: one 4px pixel copied by box-shadows.
     Row 0 overlaps the bubble's bottom border so the white joins up. */
  .tail {
    position: absolute;
    left: 20px;
    bottom: 0;
    width: var(--px);
    height: var(--px);
    background: transparent;
    box-shadow:
      /* row 0 */ 0 var(--px) #000, var(--px) var(--px) #fff, calc(var(--px) * 2) var(--px) #fff, calc(var(--px) * 3) var(--px) #fff, calc(var(--px) * 4) var(--px) #000,
      /* row 1 */ 0 calc(var(--px) * 2) #000, var(--px) calc(var(--px) * 2) #fff, calc(var(--px) * 2) calc(var(--px) * 2) #fff, calc(var(--px) * 3) calc(var(--px) * 2) #000,
      /* row 2 */ 0 calc(var(--px) * 3) #000, var(--px) calc(var(--px) * 3) #fff, calc(var(--px) * 2) calc(var(--px) * 3) #000,
      /* row 3 */ 0 calc(var(--px) * 4) #000, var(--px) calc(var(--px) * 4) #000;
  }
  .right .tail {
    left: auto;
    right: 18px;
    transform: scaleX(-1);
  }
</style>
