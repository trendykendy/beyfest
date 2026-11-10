<script lang="ts">
  // The TV's top bar on every scene: the Tetrafatalis logo on the left, a gold
  // rule underneath, and the scene name on the right ("" hides it, for scenes
  // that carry their own giant title). 108px tall at 1920 wide.
  let { title }: { title: string } = $props();
</script>

<header class="tv-header">
  <img class="logo" src="/logo-tetrafatalis.webp" alt="Beyfest: Tetrafatalis" />
  {#if title}<span class="title">{title}</span>{/if}
</header>

<style>
  .tv-header {
    position: relative;
    z-index: 1;
    flex: none;
    height: 108px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 46px;
    background: linear-gradient(180deg, rgba(5, 6, 10, 0.95), rgba(5, 6, 10, 0.75));
    border-bottom: 4px solid #e5b452;
    box-shadow: 0 0 23px rgba(255, 173, 61, 0.35);
  }
  .logo {
    display: block;
    height: 88px;
    width: auto;
  }
  .title {
    font-family: var(--tf-font-display);
    font-size: 36px;
    letter-spacing: 0.14em;
    color: #ffe6ad;
    white-space: nowrap;
  }
</style>
