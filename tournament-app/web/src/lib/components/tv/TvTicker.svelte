<script lang="ts" module>
  export type Ticker = { live?: { a: string; b: string; sa: number; sb: number }; next?: { a: string; b: string } };
</script>

<script lang="ts">
  import { SCREENS } from "$lib/terms";

  // The strip along the bottom of the table scenes: the match in battle and
  // who is summoned next. Nothing at all when there's neither. 81px tall on
  // the 1920-wide canvas; the parent places it.
  let { ticker, also = false }: { ticker: Ticker; also?: boolean } = $props();
</script>

{#if ticker.live || ticker.next}
  <div class="ticker">
    {#if ticker.live}
      <span class="lab">{also ? "Also in battle" : SCREENS.live}</span>
      <span>{ticker.live.a} <b>{ticker.live.sa}–{ticker.live.sb}</b> {ticker.live.b}</span>
    {/if}
    {#if ticker.next}
      <span class="lab">{SCREENS.upNext}</span>
      <span>{ticker.next.a} <em>v</em> {ticker.next.b}</span>
    {/if}
  </div>
{/if}

<style>
  .ticker {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 81px;
    z-index: 6;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 48px;
    font-family: var(--tf-font-text);
    font-size: 31px;
    color: #d9c79b;
    background: linear-gradient(0deg, #08080b, #111116);
    border-top: 5px solid #eab13a;
  }
  .lab {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #eab13a;
    font-size: 24px;
  }
  b {
    font-weight: 700;
    color: #ffe6ad;
    margin: 0 10px;
  }
</style>
