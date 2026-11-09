<script lang="ts">
  import { SCREENS, STAGES, TITLES } from "$lib/terms";
  import { gold } from "$lib/betting";

  // Stand-in screens for the TV's new holds (Phase 2c). They show the right
  // information plainly; Phase 4 gives them the Tetrafatalis look.
  //   respite    — between the Proving and the Paths: who goes where, and the
  //                wagerers so far
  //   eve        — before the Reckoning: the two finalists
  //   lordOfGold — after the champion: the richest wagerers
  type Wagerer = { rank: number; name: string; worth: number };
  type Circle = { name: string; rows: { name: string; path: string; tier: string }[] };
  let {
    kind,
    circles = [],
    wagerers = [],
    finalists = null,
  }: {
    kind: "respite" | "eve" | "lordOfGold";
    circles?: Circle[];
    wagerers?: Wagerer[];
    finalists?: { name: string; fighter: string }[] | null;
  } = $props();
</script>

<div class="flow {kind}">
  {#if kind === "respite"}
    <h1 class="title">{SCREENS.break}</h1>
    <p class="sub">The Proving is over. {STAGES.paths} begin soon.</p>
    <div class="cols">
      <div class="circles">
        {#each circles as c (c.name)}
          <section class="card">
            <h2>{c.name}</h2>
            <ol>
              {#each c.rows as r (r.name)}
                <li><span class="nm">{r.name}</span><span class="path tier-{r.tier}">{r.path}</span></li>
              {/each}
            </ol>
          </section>
        {/each}
      </div>
      {#if wagerers.length}
        <section class="card purse">
          <h2>Richest so far</h2>
          <ol>
            {#each wagerers.slice(0, 5) as w (w.name)}
              <li><span class="nm">{w.rank}. {w.name}</span><span>{gold(w.worth)}</span></li>
            {/each}
          </ol>
        </section>
      {/if}
    </div>
  {:else if kind === "eve"}
    <h1 class="title">{STAGES.grandFinalBuildUp}</h1>
    <p class="sub">{STAGES.grandFinal} is next.</p>
    {#if finalists}
      <div class="final">
        <div class="fighter"><span class="nm big">{finalists[0].name}</span><span class="ft">{finalists[0].fighter}</span></div>
        <span class="vs">VS</span>
        <div class="fighter"><span class="nm big">{finalists[1].name}</span><span class="ft">{finalists[1].fighter}</span></div>
      </div>
    {/if}
  {:else}
    <h1 class="title">{TITLES.topBettor}</h1>
    {#if wagerers.length}
      <p class="crowned">{wagerers[0].name}</p>
      <p class="sub">{gold(wagerers[0].worth)}</p>
      {#if wagerers.length > 1}
        <section class="card purse">
          <ol>
            {#each wagerers.slice(1, 5) as w (w.name)}
              <li><span class="nm">{w.rank}. {w.name}</span><span>{gold(w.worth)}</span></li>
            {/each}
          </ol>
        </section>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .flow {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    text-align: center;
    color: var(--paper);
  }
  .title {
    font-size: 5rem;
    line-height: 1;
  }
  .sub {
    font-family: var(--font-text);
    font-size: 2rem;
    font-weight: 600;
    color: var(--on-field-soft);
  }
  .cols {
    display: flex;
    gap: 40px;
    align-items: flex-start;
  }
  .circles {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .card {
    background: var(--paper);
    color: var(--ink);
    border: 4px solid var(--ink);
    box-shadow: 8px 8px 0 var(--ink);
    min-width: 320px;
    text-align: left;
  }
  .card h2 {
    background: var(--ink);
    color: var(--paper);
    font-size: 1.8rem;
    padding: 8px 16px;
  }
  .card ol {
    list-style: none;
    margin: 0;
    padding: 6px 0;
  }
  .card li {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 8px 16px;
    font-family: var(--font-text);
    font-size: 1.6rem;
  }
  .nm {
    font-weight: 700;
  }
  .path {
    font-weight: 700;
    padding: 0 10px;
    border: 2px solid var(--ink);
  }
  .tier-wb {
    background: var(--gold);
  }
  .tier-mb {
    background: var(--paper);
  }
  .tier-lb {
    background: var(--ink);
    color: var(--paper);
  }
  .final {
    display: flex;
    align-items: center;
    gap: 60px;
  }
  .fighter {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .big {
    font-family: var(--font-display);
    font-size: 4.5rem;
    line-height: 1;
  }
  .ft {
    font-family: var(--font-text);
    font-size: 1.8rem;
    color: var(--on-field-soft);
  }
  .vs {
    font-family: var(--font-display);
    font-size: 5rem;
    color: var(--gold);
  }
  .crowned {
    font-family: var(--font-display);
    font-size: 7rem;
    line-height: 1;
    color: var(--gold);
  }
</style>
