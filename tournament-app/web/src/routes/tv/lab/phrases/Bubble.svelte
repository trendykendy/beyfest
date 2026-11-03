<script lang="ts">
  import V5OneBit from "$lib/components/tv/speech/V5OneBit.svelte";

  // The TV's real speech bubble, drawn in the page flow (on the TV,
  // PixelBubble hangs it above the art panel instead). Zoomed down so it sits
  // in the list; the text wraps exactly as it does on the TV.
  let { text, side = "left" }: { text: string; side?: "left" | "right" } = $props();
</script>

<div class="bubble">
  <V5OneBit {text} {side} />
</div>

<style>
  .bubble {
    --tail-x: 30px; /* the same as PixelBubble's */
    --pb-max: 390px; /* the TV's (routes/tv .mc-card), so lines wrap the same */
    display: inline-block;
    zoom: 0.6;
    /* room for the dithered shadow, which hangs 8px off the box */
    margin: 0 8px 0 0;
  }
</style>
