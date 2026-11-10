<script lang="ts" module>
  import type { Ticker } from "./TvTicker.svelte";

  // Which Path a place leads to: gilded, iron, ashen; "reck" for a place in
  // The Reckoning, "out" for the end of the road, "" for no colour.
  export type PathTier = "gilded" | "iron" | "ashen" | "reck" | "out" | "";
  export type ProvingRow = { name: string; won: number; lost: number; diff: number; to: string; tier: PathTier };
  export type ProvingFixture = {
    key: string;
    a: string;
    b: string;
    mid: string; // "5–2", "W/O", "3–1" (live), "next" or "v"
    state: "done" | "live" | "next" | "later";
    won: 0 | 1 | 2; // which side won, 0 if not played
  };
  export type ProvingTablet = {
    key: string;
    title: string; // "Circle I"
    progress: string; // "5 of 12 fought" / "Final standings"
    note?: string; // a line under the heading (the Path round-robins use it)
    tier?: PathTier; // tints the heading (the Path round-robins)
    settled: boolean; // false: where each place leads is still only "as it stands"
    rows: ProvingRow[];
    fixtures: ProvingFixture[];
  };
  export type { Ticker };
</script>

<script lang="ts">
  import TvTicker from "./TvTicker.svelte";

  // The Proving (the group tables) and the Path round-robins, in the Carved
  // look: a stone tablet per Circle, with the standings, the Path each place
  // leads to, and the fixtures underneath. Purely presentational.
  //
  // Laid out on a 1920×972 canvas (the screen under the top bar), scaled to
  // the width it's given. The tablets take their natural height; if the
  // tallest would run into the strip at the bottom (big Circles), the whole
  // row is scaled down to fit rather than each size being tuned by hand.
  let { tablets, ticker = {} }: { tablets: ProvingTablet[]; ticker?: Ticker } = $props();

  const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  const ROOM = 972 - 81 - 40 - 34; // canvas, less the strip, the top margin and air above the strip

  let w = $state(1920);
  const scale = $derived(w / 1920);
  let rowH = $state(0); // the tablets' natural height
  const fit = $derived(rowH > ROOM ? ROOM / rowH : 1);

  // Two groups have the width for fixtures in two columns; three don't.
  const wide = $derived(tablets.length <= 2);
</script>

<div class="proving" bind:clientWidth={w}>
  <div class="canvas" style:transform="scale({scale})">
    <div class="rays"></div>
    <div class="fit" style:transform="scale({fit})">
      <div class="tablets n{Math.min(tablets.length, 3)}" bind:clientHeight={rowH}>
        {#each tablets as t (t.key)}
          <section class="tablet {t.tier ?? ''}">
            <header>
              <span class="tf-carved" data-t={t.title}>{t.title}</span>
              <span class="progress">{t.progress}</span>
            </header>
            {#if t.note}<p class="note">{t.note}</p>{/if}
            <div class="cols" aria-hidden="true">
              <span></span><span></span><span>Won–Lost</span><span>Points</span><span>Leads to</span>
            </div>
            {#each t.rows as r, i (r.name)}
              <div class="row">
                <span class="rk">{NUMERALS[i] ?? i + 1}</span>
                <span class="nm" class:long={r.name.length > 11}>{r.name}</span>
                <span class="wl">{r.won}–{r.lost}</span>
                <span class="df">{r.diff > 0 ? "+" : r.diff < 0 ? "−" : ""}{Math.abs(r.diff)}</span>
                <span class="to {r.tier}" class:unsure={!t.settled}>{#if r.tier}<i class="gem"></i>{/if}{r.to}</span>
              </div>
            {/each}
            <ol class="fx" class:wide>
              {#each t.fixtures as f (f.key)}
                <li class={f.state}>
                  <span class:win={f.won === 1}>{f.a}</span>
                  <span class="mid">{f.mid}</span>
                  <span class:win={f.won === 2}>{f.b}</span>
                </li>
              {/each}
            </ol>
          </section>
        {/each}
      </div>
    </div>
    <TvTicker {ticker} />
  </div>
</div>

<style>
  .proving {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(ellipse 80% 80% at 50% 50%, #23232b, #08080b 78%);
  }
  .canvas {
    --gold: #eab13a;
    --edge: #1c0c04;
    --quiet: #b9ab8c;
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 972px;
    transform-origin: 0 0;
    font-family: var(--tf-font-text);
    color: #f3e6c4;
  }
  .rays {
    position: absolute;
    inset: -20%;
    opacity: 0.1;
    mix-blend-mode: screen;
    background: repeating-conic-gradient(from 180deg at 50% -10%, rgba(255, 214, 140, 0.9) 0deg 3deg, rgba(255, 214, 140, 0) 6deg 14deg);
    mask: linear-gradient(180deg, #000 10%, transparent 80%);
  }
  .fit {
    position: absolute;
    left: 0;
    right: 0;
    top: 40px;
    transform-origin: 50% 0;
  }
  .tablets {
    display: grid;
    gap: 56px;
    padding: 0 60px;
    align-items: start;
    justify-content: center;
  }
  .tablets.n1 {
    grid-template-columns: minmax(0, 980px);
  }
  .tablets.n2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tablets.n3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 36px;
    padding: 0 40px;
  }

  /* A stone tablet with a gold edge. */
  .tablet {
    --accent: var(--gold);
    background: linear-gradient(180deg, #3d4049, #1b1d23);
    border-radius: 8px;
    box-shadow:
      0 0 0 4px var(--gold),
      0 0 0 8px var(--edge),
      0 14px 0 #000,
      0 22px 40px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 30px 12px;
    background: linear-gradient(180deg, #17181d, #0c0d10);
    border-bottom: 4px solid var(--accent);
  }
  header .tf-carved {
    font-size: 52px;
  }
  .n3 header .tf-carved {
    font-size: 42px;
    --stroke: 7px;
  }
  .progress {
    font-size: 27px;
    font-variant: small-caps;
    letter-spacing: 0.08em;
    color: var(--quiet);
    white-space: nowrap;
  }
  .n3 .progress {
    font-size: 22px;
  }
  /* The Path round-robins: the heading's rule takes the Path's metal. */
  .tablet.gilded {
    --accent: var(--tf-path-gilded);
  }
  .tablet.iron {
    --accent: var(--tf-path-iron);
  }
  .tablet.ashen {
    --accent: var(--tf-path-ashen);
  }
  .note {
    padding: 10px 30px 0;
    font-size: 26px;
    font-style: italic;
    color: var(--quiet);
  }

  .cols,
  .row {
    display: grid;
    grid-template-columns: 70px 1fr 130px 110px 250px;
    align-items: center;
    padding: 0 30px;
  }
  .n3 .cols,
  .n3 .row {
    grid-template-columns: 52px 1fr 96px 76px 176px;
    padding: 0 20px;
  }
  .cols {
    padding-top: 10px;
    font-size: 22px;
    font-variant: small-caps;
    letter-spacing: 0.1em;
    color: var(--quiet);
  }
  .n3 .cols {
    font-size: 18px;
  }
  .cols span:nth-child(n + 3),
  .row span:nth-child(n + 3) {
    text-align: center;
  }
  .row {
    height: 74px;
    border-top: 2px solid rgba(255, 255, 255, 0.07);
  }
  .n3 .row {
    height: 64px;
  }
  .rk,
  .nm,
  .wl,
  .to {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    text-transform: uppercase;
  }
  .rk {
    font-size: 34px;
    color: var(--gold);
  }
  .nm {
    font-size: 40px;
    color: #f6ecd2;
    text-shadow: 0 3px 0 #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nm.long {
    font-size: 30px;
  }
  .wl {
    font-size: 38px;
    color: #fff1c4;
  }
  .df {
    font-size: 30px;
    color: var(--quiet);
  }
  .n3 .rk {
    font-size: 26px;
  }
  .n3 .nm {
    font-size: 30px;
  }
  .n3 .nm.long {
    font-size: 23px;
  }
  .n3 .wl {
    font-size: 30px;
  }
  .n3 .df {
    font-size: 25px;
  }
  /* Where the place leads: a gem in the Path's metal, and its name. */
  .to {
    font-size: 21px;
    letter-spacing: 0.06em;
    text-align: left !important;
    white-space: nowrap;
    color: var(--c, var(--quiet));
  }
  .n3 .to {
    font-size: 16px;
  }
  .to.gilded {
    --c: var(--tf-path-gilded);
  }
  .to.iron {
    --c: #aab3bf;
  }
  .to.ashen {
    --c: #b0694f;
  }
  .to.reck {
    --c: #fff1c4;
  }
  .to.out {
    --c: #8d8577;
  }
  /* Still being fought for: paler, as it only says how things stand. */
  .to.unsure {
    opacity: 0.6;
  }
  .gem {
    display: inline-block;
    width: 0.62em;
    height: 0.62em;
    transform: rotate(45deg);
    background: var(--c);
    box-shadow:
      0 0 0 2px var(--edge),
      0 0 10px var(--c);
    margin: 0 0.6em 0 0.15em;
    vertical-align: 0.08em;
  }

  /* Fixtures, in play order. */
  .fx {
    list-style: none;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0 30px;
    padding: 14px 30px 18px;
    background: rgba(0, 0, 0, 0.28);
    border-top: 4px solid var(--edge);
    font-size: 28px;
  }
  .fx.wide {
    grid-template-columns: 1fr 1fr;
  }
  .n3 .fx {
    padding: 12px 20px 14px;
    font-size: 25px;
  }
  .fx li {
    display: grid;
    grid-template-columns: 1fr 96px 1fr;
    padding: 3px 12px;
    border-radius: 4px;
    color: #a99f8b;
    white-space: nowrap;
  }
  .fx li span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fx .mid {
    text-align: center;
  }
  .fx li span:last-child {
    text-align: right;
  }
  .fx .done {
    color: #d9c79b;
  }
  .fx .win {
    font-weight: 700;
    color: #fff1c4;
  }
  /* In battle: torch-lit. */
  .fx .live {
    color: #fff;
    font-weight: 700;
    background: linear-gradient(180deg, #c8651c, #7a3408);
    box-shadow:
      0 0 0 2px var(--edge),
      0 0 18px rgba(255, 140, 40, 0.6);
  }
  /* Summoned next: ringed in gold. */
  .fx .next {
    color: #ffe6ad;
    box-shadow: inset 0 0 0 2px var(--gold);
  }
</style>
