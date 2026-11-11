<script lang="ts">
  // One knockout match on the TV bracket: a small white telop slab. The header
  // band carries the tier colour (green Winners, gold Mid, red Losers, black
  // Grand Final). A live match keeps its tier colour (red would read as Losers)
  // and gets a "● LIVE" pill plus a white ring round the plate instead.
  import type { PBMatch } from "$lib/view";
  import { slotLabel, tierOf, isLive } from "$lib/view";
  import { pointsToWin } from "@beyfest/engine";

  let {
    match,
    names,
    groupCount,
    followId = "",
    carved = false,
  }: {
    match: PBMatch;
    names: Map<string, string>;
    groupCount: number;
    followId?: string; // the phone's followed blader, washed gold
    carved?: boolean; // the TV's Carved look: a stone plate edged in its Path's metal
  } = $props();

  const tier = $derived(tierOf(match.stage));
  const target = $derived(pointsToWin(match.stage, match.roundLabel));
  const done = $derived(match.matchStatus === "done");
  const live = $derived(isLive(match));
  const walkover = $derived(done && match.walkover);

  function side(pid: string, slot: PBMatch["slot1"]) {
    if (pid) return { name: names.get(pid) ?? "—", tbd: false };
    return { name: slotLabel(slot, groupCount), tbd: true };
  }
  const a = $derived(side(match.p1, match.slot1));
  const b = $derived(side(match.p2, match.slot2));
  // A walkover shows no score, just "Walkover" in the header.
  const s1 = $derived(walkover ? null : done ? match.p1Score : live ? match.liveP1 : null);
  const s2 = $derived(walkover ? null : done ? match.p2Score : live ? match.liveP2 : null);
  const won1 = $derived(done && match.winner === match.p1);
  const won2 = $derived(done && match.winner === match.p2);
</script>

<div class="plate tier-{tier}" class:carved class:pending={match.matchStatus === "pending"} class:live>
  <div class="phead">
    <span class="pcode">{match.code}</span>
    {#if live}
      <span class="plive"><span class="dot"></span>Live</span>
    {:else}
      <span class="pft">{walkover ? "Walkover" : `First to ${target}`}</span>
    {/if}
  </div>
  <div class="side" class:won={won1} class:lost={won2} class:tbd={a.tbd} class:me={!!followId && match.p1 === followId}>
    <span class="nm">{a.name}</span>
    {#if s1 !== null}<span class="sc">{s1}</span>{/if}
  </div>
  <div class="side" class:won={won2} class:lost={won1} class:tbd={b.tbd} class:me={!!followId && match.p2 === followId}>
    <span class="nm">{b.name}</span>
    {#if s2 !== null}<span class="sc">{s2}</span>{/if}
  </div>
</div>

<style>
  .plate {
    --tier: var(--gold);
    --tier-ink: var(--ink);
    background: var(--paper);
    color: var(--ink);
    border: var(--outline) solid var(--ink);
    box-shadow: 6px 6px 0 var(--ink);
    min-width: 280px;
  }
  .tier-wb {
    --tier: var(--wb);
  }
  .tier-mb {
    --tier: var(--mb);
  }
  .tier-lb {
    --tier: var(--lb);
    --tier-ink: var(--paper);
  }
  .tier-gf {
    --tier: var(--ink);
    --tier-ink: var(--gold);
  }
  /* Being played: a white ring outside the black outline, so it stands out on
     the field without touching the tier colour. Outline, so no layout shift. */
  .plate.live {
    outline: 4px solid var(--paper);
    outline-offset: 0;
  }
  /* Waiting on earlier results: present but quiet. */
  .plate.pending {
    background: #dfe3f2;
    box-shadow: none;
    border-style: dashed;
  }

  .phead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    background: var(--tier);
    color: var(--tier-ink);
    border-bottom: var(--outline) solid var(--ink);
    padding: 4px 12px 5px;
    font-family: var(--font-text);
    font-weight: 700;
    font-size: 1.05rem;
    line-height: 1.2;
  }
  .pcode {
    font-weight: 800;
  }
  .plive {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: center;
    background: var(--ink);
    color: var(--paper);
    padding: 1px 10px 2px 8px;
    border-radius: 999px;
    font-weight: 800;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  /* The Grand Final band is already black: flip the pill to white. */
  .tier-gf .plive {
    background: var(--paper);
    color: var(--ink);
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--red);
    /* Opacity only: cheap. Reduced motion is handled in theme.css. */
    animation: live-pulse 1.2s ease-in-out infinite;
  }
  @keyframes live-pulse {
    50% {
      opacity: 0.25;
    }
  }

  .side {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    min-height: 54px;
  }
  .side + .side {
    border-top: 2px solid #e3e6f3;
  }
  .nm {
    align-self: center;
    font-family: var(--font-display);
    font-stretch: 62%;
    text-transform: uppercase;
    font-size: 2rem;
    line-height: 1;
    padding: 6px 12px 6px 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Unresolved slot, e.g. "Winner of MB1": readable, but clearly not a name. */
  .side.tbd .nm {
    font-family: var(--font-text);
    font-stretch: 100%;
    text-transform: none;
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--ink-soft);
  }
  .sc {
    flex: none;
    min-width: 58px;
    display: grid;
    place-items: center;
    font-family: var(--font-display);
    font-size: 2.2rem;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    border-left: 2px solid #e3e6f3;
  }
  .side.won .sc {
    background: var(--gold);
    border-left-color: var(--ink);
  }
  .side.lost {
    color: var(--ink-soft);
  }
  /* The followed blader (phone only): a gold wash, name underlined, as on the
     phone's match rows. */
  .side.me {
    background: color-mix(in srgb, var(--gold) 26%, var(--paper));
  }
  .side.me .nm {
    text-decoration: underline 3px var(--ink);
    text-underline-offset: 3px;
  }

  /* ── The TV's Carved look ────────────────────────────────────────────
     A stone plate edged in its Path's metal (gilded, iron, ashen; bright gold
     for The Reckoning). In battle it's torch-lit; waiting on results it's dim. */
  .plate.carved {
    --tier: var(--tf-path-gilded);
    --tier-ink: #1c0c04;
    background: linear-gradient(180deg, #3d4049, #1b1d23);
    color: #f6ecd2;
    border: 0;
    border-radius: 5px;
    box-shadow:
      0 0 0 3px var(--tier),
      0 0 0 6px #1c0c04,
      0 8px 0 #000;
    overflow: hidden;
  }
  .carved.tier-mb {
    --tier: #aab3bf;
  }
  .carved.tier-lb {
    --tier: #b0694f;
  }
  .carved.tier-gf {
    --tier: #ffd257;
  }
  .plate.carved.live {
    outline: 0;
    box-shadow:
      0 0 0 3px #ff9d2e,
      0 0 0 6px #1c0c04,
      0 8px 0 #000,
      0 0 26px rgba(255, 140, 40, 0.7);
  }
  .plate.carved.pending {
    background: linear-gradient(180deg, #2a2c33, #15161b);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--tier) 45%, #1c0c04),
      0 0 0 6px #1c0c04;
  }
  .carved .phead {
    background: linear-gradient(180deg, color-mix(in srgb, var(--tier) 88%, #fff), color-mix(in srgb, var(--tier) 70%, #000));
    color: var(--tier-ink);
    border-bottom: 3px solid #1c0c04;
    font-family: var(--tf-font-text);
    font-size: 1.1rem;
    font-variant: small-caps;
    letter-spacing: 0.06em;
  }
  .carved .plive {
    background: #1c0c04;
    color: #ffe6ad;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-variant: normal;
  }
  .carved .dot {
    background: #ff9d2e;
  }
  .carved .side + .side {
    border-top: 2px solid rgba(255, 255, 255, 0.08);
  }
  .carved .nm {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-stretch: 100%;
    font-size: 1.55rem;
    text-shadow: 0 2px 0 #000;
  }
  .carved .side.tbd .nm {
    font-family: var(--tf-font-text);
    font-weight: 400;
    font-style: italic;
    font-size: 1.35rem;
    color: #8d8577;
    text-shadow: none;
  }
  .carved .sc {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 1.8rem;
    border-left: 2px solid rgba(255, 255, 255, 0.08);
    color: #a99f8b;
  }
  .carved .side.won .sc {
    background: none;
    color: #ffd257;
    border-left-color: rgba(255, 255, 255, 0.08);
  }
  .carved .side.won .nm {
    color: #fff1c4;
  }
  .carved .side.me {
    background: linear-gradient(90deg, rgba(234, 177, 58, 0.3), transparent 80%);
    box-shadow: inset 4px 0 0 #eab13a;
  }
  .carved .side.me .nm {
    text-decoration: none;
  }
  .carved .side.lost {
    color: #8d8577;
  }
</style>
