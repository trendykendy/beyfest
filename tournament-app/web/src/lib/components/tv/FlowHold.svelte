<script lang="ts">
  import { SCREENS, STAGES, TITLES, WAGERS } from "$lib/terms";
  import { gold } from "$lib/betting";
  import FighterSilhouette from "./FighterSilhouette.svelte";

  // The screens the organiser holds the TV on between stages, in the Carved
  // look:
  //   respite    — between the Proving and the Paths: who goes where, the
  //                richest wagerers so far, and that the big wagers are open
  //   eve        — before the Reckoning: the two finalists, face to face
  //   lordOfGold — after the champion: the richest wagerer, then the next four
  // On a 1920×972 canvas (the screen under the top bar), scaled to the width
  // it's given.
  type Wagerer = { rank: number; name: string; worth: number };
  type Circle = { name: string; rows: { name: string; path: string; tier: string }[] };
  type Finalist = {
    name: string; // the name they play under
    fighter: string; // their fighter's name ("" without one)
    art?: { src: string; style: string } | null; // portrait (faceCrop style), null = silhouette
    record?: string; // "7–1" so far
  };
  let {
    kind,
    circles = [],
    wagerers = [],
    finalists = null,
    wagersOpen = false,
  }: {
    kind: "respite" | "eve" | "lordOfGold";
    circles?: Circle[];
    wagerers?: Wagerer[];
    finalists?: Finalist[] | null;
    wagersOpen?: boolean; // respite: the outright wagers can be placed now
  } = $props();

  const NUMERALS = ["I", "II", "III", "IV", "V"];
  let w = $state(1920);
  const scale = $derived(w / 1920);
  // Three circles and the Hall of Fortune make four columns: tighter type.
  const columns = $derived(circles.length + (wagerers.length ? 1 : 0));
</script>

{#snippet purse(list: Wagerer[])}
  <ol>
    {#each list as r (r.name)}
      <li><b>{r.name}</b><em>{gold(r.worth)}</em></li>
    {/each}
  </ol>
{/snippet}

<div class="flow {kind}" bind:clientWidth={w}>
  <div class="canvas" style:transform="scale({scale})">
    {#if kind === "lordOfGold"}<div class="coins"></div>{/if}
    <div class="rays"></div>

    {#if kind === "respite"}
      <div class="head">
        <span class="tf-carved big" data-t={SCREENS.break}>{SCREENS.break}</span>
        <p class="sub">{STAGES.groups} is over. {STAGES.paths} begin soon.</p>
      </div>
      <div class="cols" class:tight={columns > 3}>
        {#each circles as c (c.name)}
          <section class="slab">
            <header><span class="tf-carved" data-t={c.name}>{c.name}</span></header>
            <ol>
              {#each c.rows as r (r.name)}
                <li>
                  <b>{r.name}</b>
                  <span class="to {r.path === 'Seeded' ? '' : r.tier}">{#if r.path !== "Seeded"}<i class="gem"></i>{/if}{r.path}</span>
                </li>
              {/each}
            </ol>
          </section>
        {/each}
        {#if wagerers.length}
          <section class="slab">
            <header><span class="tf-carved" data-t={WAGERS.leaderboard}>{WAGERS.leaderboard}</span></header>
            {@render purse(wagerers.slice(0, 5))}
          </section>
        {/if}
      </div>
      {#if wagersOpen}
        <div class="open">
          <span class="plate">Wagers are open</span>
          <span>Back the Hero and each Path's victor on your phone, before {STAGES.paths} begin.</span>
        </div>
      {/if}
    {:else if kind === "eve"}
      <div class="head">
        <span class="tf-carved big" data-t={STAGES.grandFinalBuildUp}>{STAGES.grandFinalBuildUp}</span>
      </div>
      {#if finalists}
        {#each finalists as f, i (f.name)}
          <div class="side {i === 0 ? 'l' : 'r'}">
            <div class="ring">
              {#if f.art}<img src={f.art.src} alt="" style={f.art.style} />{:else}<div class="sil"><FighterSilhouette flip={i === 0} /></div>{/if}
            </div>
            <span class="tf-carved stone nm" class:long={(f.fighter || f.name).length > 14} data-t={f.fighter || f.name}>{f.fighter || f.name}</span>
            <p>{#if f.fighter}{f.name}{/if}{#if f.fighter && f.record}{" · "}{/if}{#if f.record}<b>{f.record}</b> so far{/if}</p>
          </div>
        {/each}
        <div class="mid">
          <span class="tf-carved" data-t="VS">VS</span>
          <p>{STAGES.grandFinal} · first to nine</p>
        </div>
      {/if}
      <p class="foot">One of them breaks the Ring.</p>
    {:else}
      <div class="head">
        <span class="tf-carved" data-t={TITLES.topBettor}>{TITLES.topBettor}</span>
      </div>
      {#if wagerers.length}
        {@const top = wagerers[0]}
        <div class="crowned">
          <span class="tf-carved stone nm" class:long={top.name.length > 12} data-t={top.name}>{top.name}</span>
          <span class="tf-carved amt" data-t={gold(top.worth)}>{gold(top.worth)}</span>
        </div>
        {#if wagerers.length > 1}
          <section class="slab rest">
            <ol>
              {#each wagerers.slice(1, 5) as r (r.name)}
                <li><b>{NUMERALS[r.rank - 1] ?? r.rank} · {r.name}</b><em>{gold(r.worth)}</em></li>
              {/each}
            </ol>
          </section>
        {/if}
      {/if}
    {/if}
  </div>
</div>

<style>
  .flow {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(ellipse 80% 80% at 50% 50%, #23232b, #08080b 78%);
  }
  .flow.lordOfGold {
    background: radial-gradient(ellipse 70% 70% at 50% 35%, #3a2d14, #08080b 75%);
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
  .head {
    position: absolute;
    left: 0;
    right: 0;
    top: 40px;
    text-align: center;
  }
  .head .tf-carved {
    font-size: 70px;
    --stroke: 9px;
    --drop: 6px;
  }
  .head .big {
    font-size: 88px;
    --stroke: 12px;
    --drop: 7px;
  }
  .sub {
    font-size: 34px;
    font-variant: small-caps;
    letter-spacing: 0.12em;
    color: #e9cf8e;
  }

  /* Stone tablets. */
  .slab {
    background: linear-gradient(180deg, #3d4049, #1b1d23);
    border-radius: 8px;
    box-shadow:
      0 0 0 4px var(--gold),
      0 0 0 8px var(--edge),
      0 14px 0 #000,
      0 22px 40px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }
  .slab header {
    padding: 14px 26px 10px;
    background: linear-gradient(180deg, #17181d, #0c0d10);
    border-bottom: 4px solid var(--gold);
  }
  .slab header .tf-carved {
    font-size: 40px;
    --stroke: 6px;
  }
  .slab ol {
    list-style: none;
  }
  .slab li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    height: 66px;
    padding: 0 26px;
    border-top: 2px solid rgba(255, 255, 255, 0.07);
  }
  .slab li:first-child {
    border-top: 0;
  }
  .slab b,
  .slab em,
  .to {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-style: normal;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .slab b {
    font-size: 32px;
    color: #f6ecd2;
    text-shadow: 0 3px 0 #000;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .slab em {
    font-size: 30px;
    color: #ffd257;
  }
  .to {
    font-size: 19px;
    letter-spacing: 0.06em;
    color: var(--c, var(--quiet));
  }
  .to.wb {
    --c: var(--tf-path-gilded);
  }
  .to.mb {
    --c: #aab3bf;
  }
  .to.lb {
    --c: #b0694f;
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

  /* ── The Respite ── */
  .cols {
    position: absolute;
    left: 70px;
    right: 70px;
    top: 250px;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 44px;
    align-items: start;
    justify-content: center;
  }
  .cols.tight {
    left: 40px;
    right: 40px;
    gap: 30px;
  }
  .tight .slab header .tf-carved {
    font-size: 32px;
  }
  .tight .slab li {
    height: 58px;
    padding: 0 18px;
  }
  .tight .slab b {
    font-size: 25px;
  }
  .tight .slab em {
    font-size: 24px;
  }
  .tight .to {
    font-size: 15px;
  }
  .open {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 26px;
    font-size: 36px;
    color: #e9cf8e;
  }
  .plate {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 27px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #2a1606;
    padding: 9px 28px 7px;
    background: linear-gradient(180deg, #ffe08a, #c98a1c);
    border: 4px solid #fff1c4;
    border-radius: 6px;
    box-shadow:
      0 0 0 3px var(--edge),
      0 6px 0 #000;
    white-space: nowrap;
  }

  /* ── Eve of the Reckoning ── */
  .side {
    position: absolute;
    top: 200px;
    width: 700px;
    text-align: center;
  }
  .side.l {
    left: 80px;
  }
  .side.r {
    right: 80px;
  }
  .ring {
    position: relative;
    width: 400px;
    height: 400px;
    margin: 0 auto;
    border-radius: 50%;
    overflow: hidden;
    background: radial-gradient(circle at 50% 35%, #3a3f55, #101218 78%);
    box-shadow:
      0 0 0 10px var(--gold),
      0 0 0 16px var(--edge),
      0 0 70px rgba(255, 150, 40, 0.4);
  }
  /* Without a face point: full height, centred. faceCrop's inline style wins. */
  .ring img {
    position: absolute;
    left: 50%;
    top: -10%;
    height: 180%;
    transform: translateX(-50%);
  }
  .sil {
    position: absolute;
    left: 6%;
    right: 6%;
    top: 22%;
    --lite: #e9b75a;
  }
  .side .nm {
    display: block;
    width: max-content; /* so its carved layers sit over the word, centred */
    margin: 34px auto 0;
    font-size: 58px;
    --stroke: 8px;
  }
  .side .nm.long {
    font-size: 46px;
    --stroke: 7px;
  }
  .side p {
    margin-top: 6px;
    font-size: 32px;
    color: #e9cf8e;
  }
  .side p b {
    color: #fff1c4;
  }
  .mid {
    position: absolute;
    left: 50%;
    top: 300px;
    transform: translateX(-50%);
    text-align: center;
    white-space: nowrap;
  }
  .mid .tf-carved {
    font-size: 150px;
    --stroke: 16px;
    --drop: 10px;
  }
  .mid p {
    margin-top: 18px;
    font-size: 34px;
    font-variant: small-caps;
    letter-spacing: 0.14em;
    color: #e9cf8e;
  }
  .foot {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 50px;
    text-align: center;
    font-size: 34px;
    font-style: italic;
    color: var(--quiet);
  }

  /* ── Lord of Gold ── */
  .coins {
    position: absolute;
    inset: 0;
    opacity: 0.5;
    background-image:
      radial-gradient(circle, #ffd257 0 5px, #8a5512 6px, transparent 7px), radial-gradient(circle, #fff1c4 0 3px, transparent 4px);
    background-size:
      311px 277px,
      197px 233px;
    background-position:
      40px 20px,
      120px 90px;
    mask: linear-gradient(180deg, #000, transparent 70%);
  }
  .crowned {
    position: absolute;
    left: 0;
    right: 0;
    top: 170px;
    text-align: center;
  }
  .crowned .nm {
    font-size: 150px;
    --stroke: 18px;
    --drop: 10px;
  }
  .crowned .nm.long {
    font-size: 100px;
    --stroke: 13px;
  }
  .crowned .amt {
    display: block;
    width: max-content;
    margin: 4px auto 0;
    font-size: 96px;
    --stroke: 12px;
  }
  .rest {
    position: absolute;
    left: 50%;
    top: 560px;
    transform: translateX(-50%);
    width: 900px;
  }
  .rest b,
  .rest em {
    font-size: 34px;
  }
</style>
