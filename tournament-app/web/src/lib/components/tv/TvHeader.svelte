<script lang="ts">
  import LiveQr from "./LiveQr.svelte";

  // The TV's top bar on every scene: the Tetrafatalis logo on the left, a gold
  // rule underneath, the scene name on the right ("" hides it, for scenes that
  // carry their own giant title), and after it the phone page's QR code (left
  // out on scenes that have a big one of their own). 108px tall at 1920 wide.
  let { title, qr = null }: { title: string; qr?: { size: number; path: string } | null } = $props();
</script>

<header class="tv-header">
  <img class="logo" src="/logo-tetrafatalis.webp" alt="Beyfest: Tetrafatalis" />
  {#if title}<span class="title tf-carved" data-t={title}>{title}</span>{/if}
  {#if qr}
    <div class="qr">
      <span>Scan for<br />live results</span>
      <LiveQr size={qr.size} path={qr.path} px={84} />
    </div>
  {/if}
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
    gap: 30px;
    padding: 0 30px 0 46px;
    background: linear-gradient(180deg, #111116, #08080b);
    border-bottom: 7px solid #eab13a;
    box-shadow: 0 0 23px rgba(255, 173, 61, 0.35);
  }
  .logo {
    display: block;
    height: 88px;
    width: auto;
    margin-right: auto; /* everything else sits on the right */
  }
  .title {
    /* Carved gold capitals (theme.css .tf-carved). */
    font-size: 38px;
    letter-spacing: 0.04em;
    --stroke: 6px;
    --drop: 3px;
  }
  .qr {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--tf-font-text);
    font-size: 20px;
    line-height: 1.1;
    font-variant: small-caps;
    letter-spacing: 0.08em;
    text-align: right;
    color: #e9cf8e;
  }
  /* The code in a gold rim, like the portraits'. */
  .qr :global(svg) {
    box-shadow:
      0 0 0 3px #eab13a,
      0 0 0 6px #1c0c04;
  }
</style>
