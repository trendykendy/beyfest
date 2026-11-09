<script lang="ts">
  // The champion's crest: a gold bey with a crown, in a laurel wreath
  // (static/trophy.webp). An image rather than the 🏆 emoji, which looked
  // different on every machine. `size` sets the width; the crest is a little wider
  // than it is tall.
  let { size = "1em", label = "" }: { size?: string; label?: string } = $props();
</script>

<img
  class="trophy"
  src="/trophy.webp"
  alt={label}
  aria-hidden={label ? undefined : "true"}
  style:width={size}
  draggable="false"
/>

<style>
  .trophy {
    display: inline-block;
    height: auto;
    vertical-align: -0.12em;
    flex: none;
  }
</style>
