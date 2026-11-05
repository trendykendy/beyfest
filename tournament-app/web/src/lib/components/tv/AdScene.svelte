<script lang="ts">
  import { layerAt, type Ad } from "$lib/ads";

  // One moment of an ad, a pure function of `t` (ms). Every layer stays in the
  // page and is only hidden, so they all load up front and nothing pops in
  // mid-ad. Stills push in from the top edge, because the sofa shot's head is
  // tight against the frame; the starburst slams in around its own spot on
  // the end card.
  let { ad, t }: { ad: Ad; t: number } = $props();
</script>

<div class="scene">
  {#each ad.layers as layer (layer.src)}
    {@const now = layerAt(layer, t)}
    <img
      src={layer.src}
      alt=""
      class:pop={layer.move === "pop"}
      style:visibility={now.visible ? "visible" : "hidden"}
      style:transform={now.transform}
    />
  {/each}
</div>

<style>
  .scene {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform-origin: 50% 0;
  }
  img.pop {
    transform-origin: 50% 77%;
  }
</style>
