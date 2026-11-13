<svelte:options namespace="svg" />

<script lang="ts">
  // A ring of runes for a 200×200 viewBox: gold circles plus the Elder
  // Futhark, twice, each rune set at an equal step round the circle so the
  // ring is always full. Goes inside an <svg viewBox="0 0 200 200">; colour
  // comes from currentColor. Used by the VS intro and the Arena portraits.
  let {
    r, // radius the runes sit on
    size, // rune font size
    circles, // radii of the circles; the first is drawn a little heavier
  }: { r: number; size: number; circles: number[] } = $props();

  const RUNES = [..."ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ".repeat(2)];
</script>

<g fill="none" stroke="currentColor">
  {#each circles as c, i}<circle cx="100" cy="100" r={c} stroke-width={i ? 1 : 1.3} />{/each}
</g>
<g class="runes" font-size={size} fill="currentColor" text-anchor="middle" dominant-baseline="central">
  {#each RUNES as rune, i}
    <text x="100" y={100 - r} transform="rotate({(i * 360) / RUNES.length} 100 100)">{rune}</text>
  {/each}
</g>

<style>
  .runes {
    font-family: var(--tf-font-runic);
  }
</style>
