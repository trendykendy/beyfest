<script lang="ts">
  import { pointsToWin } from "@beyfest/engine";
  import { FINISHES } from "$lib/finishes";
  import { isNorth, southOf, stadiumOf } from "$lib/stadia";
  import { SCREENS } from "$lib/terms";
  import { matchContext, sideName, tierOf, type PBMatch } from "$lib/view";

  // A match being played, as a phone-sized Arena: the one dark stone card on
  // the parchment page, so it stands out. Both bladers stacked
  // with their running score, a pill for every round each has won, the target
  // between them, and this round's stadium once it's drawn.
  let {
    match,
    matches,
    names,
    groupCount,
    followId = "",
  }: {
    match: PBMatch;
    matches: PBMatch[];
    names: Map<string, string>;
    groupCount: number;
    followId?: string;
  } = $props();

  const FINISH_BY_KEY = new Map(FINISHES.map((f) => [f.key, f]));

  const target = $derived(pointsToWin(match.stage, match.roundLabel));
  // Reaching the target ends it, even before the organiser saves the result.
  const decided = $derived(match.liveP1 >= target || match.liveP2 >= target);
  const stadium = $derived(decided ? null : stadiumOf(match.stadium));
  // Each side's rounds won, oldest first (rounds with an unknown finish skipped).
  const pills = $derived.by(() => {
    const out: Record<1 | 2, { i: number; label: string; pts: number }[]> = { 1: [], 2: [] };
    match.liveLog.forEach((r, i) => {
      const f = FINISH_BY_KEY.get(r.finish);
      if (f) out[r.who].push({ i, label: f.label, pts: f.pts });
    });
    return out;
  });

  const sides = $derived([
    { who: 1 as const, id: match.p1, score: match.liveP1 },
    { who: 2 as const, id: match.p2, score: match.liveP2 },
  ]);
</script>

<article class="lm tier-{tierOf(match.stage)}">
  <header class="lm-top">
    {#if decided}<span class="tag won">Match won</span>{:else}<span class="tag live">{SCREENS.live}</span>{/if}
    <span class="ctx">{matchContext(match, matches)}</span>
  </header>

  {#if stadium}
    <div class="stadium" data-stadium={stadium.key}>
      <span class="rd">Round {match.liveLog.length + 1}</span>
      <span class="num">{stadium.num}</span>
      <span class="nm">{stadium.name}</span>
    </div>
    {#if isNorth(match.north)}
      {@const north = match.north === 1 ? match.p1 : match.p2}
      {@const south = southOf(match.north) === 1 ? match.p1 : match.p2}
      <p class="sides">North <b>{names.get(north) ?? "—"}</b> · South <b>{names.get(south) ?? "—"}</b></p>
    {/if}
  {/if}

  {#each sides as s, i (s.who)}
    {#if i === 1}
      <!-- The target, between the two scores it's read against. -->
      <div class="ft"><span>First to <b>{target}</b></span></div>
    {/if}
    {@const other = sides[1 - i].score}
    <div class="side" class:won={decided && s.score > other} class:lost={decided && s.score < other} class:me={!!followId && s.id === followId}>
      <span class="name">{sideName(match, s.who, names, groupCount)}</span>
      <span class="score">{s.score}</span>
      {#if pills[s.who].length}
        <div class="pills">
          {#each pills[s.who] as p (p.i)}
            <span class="pill">{p.label} <b>+{p.pts}</b></span>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</article>

<style>
  /* Dark stone edged in gold, gold numerals: the TV's Arena in miniature. */
  .lm {
    --tier: #eab13a;
    background: linear-gradient(180deg, #2f3139, #15161b);
    color: #f3e6c4;
    border-radius: 6px;
    box-shadow:
      0 0 0 3px var(--tier),
      0 0 0 5px #1c0c04,
      0 6px 0 rgba(0, 0, 0, 0.45);
    margin: 5px;
    overflow: hidden;
  }
  .tier-mb {
    --tier: #aab3bf;
  }
  .tier-lb {
    --tier: #b0694f;
  }
  .tier-gf {
    --tier: #ffd257;
  }
  .lm-top {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px 8px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.08);
  }
  .tag {
    font-family: var(--font-display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    line-height: 1;
    padding: 5px 9px 4px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .tag.live {
    color: #fff;
    background: linear-gradient(180deg, #c8651c, #7a3408);
    box-shadow: 0 0 12px rgba(255, 140, 40, 0.6);
  }
  .tag.won {
    color: #2a1606;
    background: linear-gradient(180deg, #ffe08a, #c98a1c);
  }
  .ctx {
    font-size: 0.95rem;
    font-variant: small-caps;
    letter-spacing: 0.05em;
    line-height: 1.2;
    min-width: 0;
    color: #e9cf8e;
  }
  /* This round's arena: its numeral in the arena's colour, then its name. */
  .stadium {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 8px;
    margin: 10px 12px 0;
    font-size: 0.95rem;
    color: #b9ab8c;
  }
  .stadium .rd {
    font-variant: small-caps;
    letter-spacing: 0.05em;
  }
  .stadium .num {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 0.8rem;
    line-height: 1;
    padding: 3px 7px 2px;
    border-radius: 3px;
    background: var(--st);
    color: var(--st-ink);
  }
  .stadium .nm {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 0.85rem;
    text-transform: uppercase;
    color: #f6ecd2;
  }
  .sides {
    margin: 4px 12px 0;
    font-size: 0.9rem;
    color: #b9ab8c;
  }
  .sides b {
    color: #f6ecd2;
  }
  .side {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 10px;
    padding: 10px 12px;
  }
  .side.me {
    background: linear-gradient(90deg, rgba(234, 177, 58, 0.28), transparent 80%);
    box-shadow: inset 4px 0 0 #eab13a;
  }
  .name {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 1.35rem;
    line-height: 1.1;
    text-transform: uppercase;
    color: #f6ecd2;
    text-shadow: 0 2px 0 #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .score {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 2.8rem;
    line-height: 1;
    min-width: 1.2em;
    text-align: center;
    color: transparent;
    background: linear-gradient(180deg, #fffbe0 8%, #ffd257 40%, #b96a10 75%);
    -webkit-background-clip: text;
    background-clip: text;
    filter: drop-shadow(0 3px 0 #1c0c04);
  }
  .lost .name {
    color: #8d8577;
  }
  .lost .score {
    opacity: 0.5;
  }
  .pills {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 6px;
  }
  .pill {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 0.62rem;
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 4px 7px 3px;
    border-radius: 3px;
    color: #ffe6ad;
    background: #1c0c04;
    box-shadow: 0 0 0 1.5px #eab13a;
  }
  .pill b {
    color: #ffcf73;
  }
  /* "First to 5" sits on the line between the two sides. */
  .ft {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    font-size: 0.85rem;
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: #b9ab8c;
  }
  .ft::before,
  .ft::after {
    content: "";
    flex: 1;
    border-top: 2px solid rgba(255, 255, 255, 0.1);
  }
  .ft b {
    color: #fff1c4;
  }
</style>
