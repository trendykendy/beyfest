<script lang="ts">
  import lines from "$lib/speech/lines.json";
  import starterList from "../../../../../static/starter-fighters/fighters.json";
  import Bubble from "./Bubble.svelte";
  import { page } from "$app/state";
  import { onMount } from "svelte";

  // Review lab for the Match centre speech-bubble lines. Not linked from
  // anywhere; dev only (the review endpoint 404s in a built app). Verdicts are
  // saved to src/lib/speech/review.json as you click.

  type Solo = { id: string; text: string };
  type Rival = { id: string; lead: string; line: string; reply: string };
  type Verdict = { status: "approved" | "denied"; note?: string; at: string; textAtReview: string };
  type Status = "unreviewed" | "approved" | "denied" | "rewritten";
  type Filter = "all" | Status;

  const solo = lines.solo as Record<string, Solo[]>;
  const rivals = lines.rivals as Record<string, Rival[]>;
  const names = starterList.map((f) => f.name).sort();
  const art = Object.fromEntries(starterList.map((f) => [f.name, `/starter-fighters/${f.image}`]));
  const short = (n: string) => n.replace(/^The /, "");

  // One flat list of reviewable items. `text` is what gets stored as
  // textAtReview, so a later edit to the line shows up as "rewritten".
  type Item = { id: string; group: string; text: string; solo?: Solo; rival?: Rival };
  const items: Item[] = [
    ...Object.entries(solo).flatMap(([n, l]) => l.map((s) => ({ id: s.id, group: n, text: s.text, solo: s }))),
    ...Object.entries(rivals).flatMap(([k, l]) =>
      l.map((r) => ({ id: r.id, group: k, text: `${r.line} / ${r.reply}`, rival: r })),
    ),
  ];

  let review = $state<Record<string, Verdict>>({});
  let loaded = $state(false);
  let loadError = $state("");
  let saving = $state<Record<string, "saving" | "saved" | "error">>({});
  let notes = $state<Record<string, string>>({});

  const q = page.url.searchParams;
  let tab = $state<"solo" | "rivals">(q.get("tab") === "rivals" ? "rivals" : "solo");
  let fighter = $state(names.includes(q.get("f") ?? "") ? q.get("f")! : names[0]);
  let pair = $state(rivals[q.get("pair") ?? ""] ? q.get("pair")! : `${names[0]}|${names[1]}`);
  let filter = $state<Filter>((q.get("filter") as Filter) ?? "all");
  let everywhere = $state(q.has("everywhere")); // filter across every fighter / pair

  function statusOf(it: Item): Status {
    const v = review[it.id];
    if (!v) return "unreviewed";
    // Any change to the text since the verdict needs a fresh look.
    if (v.textAtReview !== it.text) return "rewritten";
    return v.status;
  }

  type Counts = Record<Status, number> & { total: number };
  function count(list: Item[]): Counts {
    const c: Counts = { unreviewed: 0, approved: 0, denied: 0, rewritten: 0, total: list.length };
    for (const it of list) c[statusOf(it)]++;
    return c;
  }

  const byGroup = $derived.by(() => {
    const m: Record<string, Item[]> = {};
    for (const it of items) (m[it.group] ??= []).push(it);
    return m;
  });
  const soloItems = $derived(items.filter((i) => i.solo));
  const rivalItems = $derived(items.filter((i) => i.rival));
  const overall = $derived(count(items));
  const soloAll = $derived(count(soloItems));
  const rivalAll = $derived(count(rivalItems));
  // Per fighter: their solo lines plus the rival exchanges they lead.
  const groupCounts = $derived(Object.fromEntries(Object.entries(byGroup).map(([g, l]) => [g, count(l)])));

  const shown = $derived.by(() => {
    const base = everywhere ? (tab === "solo" ? soloItems : rivalItems) : (byGroup[tab === "solo" ? fighter : pair] ?? []);
    return filter === "all" ? base : base.filter((i) => statusOf(i) === filter);
  });

  onMount(async () => {
    try {
      const r = await fetch("/tv/lab/phrases/review");
      if (!r.ok) throw new Error(`${r.status}`);
      review = await r.json();
      for (const [id, v] of Object.entries(review)) if (v.note) notes[id] = v.note;
      loaded = true;
    } catch (e) {
      loadError = `Couldn't load the review (${e}). The lab only works on the dev server.`;
    }
  });

  async function save(list: Item[], status: "approved" | "denied" | "clear") {
    if (!list.length) return;
    const verdicts: Record<string, { status: string; note?: string; textAtReview: string }> = {};
    for (const it of list) {
      verdicts[it.id] = { status, note: notes[it.id] ?? "", textAtReview: it.text };
      saving[it.id] = "saving";
    }
    try {
      const r = await fetch("/tv/lab/phrases/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ verdicts }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      review = await r.json();
      for (const it of list) saving[it.id] = "saved";
    } catch {
      for (const it of list) saving[it.id] = "error";
    }
  }

  // Notes save on blur, but only once the item has a verdict (otherwise they
  // ride along with the Approve / Deny click).
  function noteChanged(it: Item) {
    const v = review[it.id];
    if (v && (v.note ?? "") !== (notes[it.id] ?? "").trim()) save([it], v.status);
  }

  function approveRemaining() {
    save(
      shown.filter((i) => statusOf(i) === "unreviewed"),
      "approved",
    );
  }

  function nextUnreviewed() {
    const list = tab === "solo" ? names : Object.keys(rivals);
    const start = list.indexOf(tab === "solo" ? fighter : pair);
    for (let k = 1; k <= list.length; k++) {
      const g = list[(start + k) % list.length];
      const c = groupCounts[g];
      if (c.unreviewed + c.rewritten > 0) {
        if (tab === "solo") fighter = g;
        else pair = g;
        everywhere = false;
        return;
      }
    }
  }

  const pairKey = (a: string, b: string) => [a, b].sort().join("|");
  const pct = (c: Counts) => Math.round(((c.approved + c.denied) / Math.max(1, c.total)) * 100);
  const FILTERS: Filter[] = ["all", "unreviewed", "approved", "denied", "rewritten"];
</script>

<svelte:head><title>Phrases · lab</title></svelte:head>

{#snippet bar(c: Counts)}
  <span class="bar" title="{c.approved} approved, {c.denied} denied, {c.rewritten} rewritten, {c.unreviewed} unreviewed">
    <i class="approved" style:flex={c.approved}></i>
    <i class="denied" style:flex={c.denied}></i>
    <i class="rewritten" style:flex={c.rewritten}></i>
    <i class="unreviewed" style:flex={c.unreviewed}></i>
  </span>
{/snippet}

{#snippet tally(c: Counts)}
  <span class="tally">
    <b class="t-approved">{c.approved}✓</b>
    <b class="t-denied">{c.denied}✗</b>
    {#if c.rewritten}<b class="t-rewritten">{c.rewritten}↻</b>{/if}
    <span class="t-left">{c.unreviewed} left</span>
  </span>
{/snippet}

<div class="page">
  <header>
    <h1>Speech bubbles <span class="kana">セリフ</span></h1>
    <div class="overall">
      <span>Overall {pct(overall)}%</span>
      {@render bar(overall)}
      {@render tally(overall)}
    </div>
  </header>

  {#if loadError}<p class="error">{loadError}</p>{/if}

  <nav class="tabs">
    <button class:on={tab === "solo"} onclick={() => (tab = "solo")}>
      Solo <small>{soloAll.approved + soloAll.denied}/{soloAll.total}</small>
    </button>
    <button class:on={tab === "rivals"} onclick={() => (tab = "rivals")}>
      Rivals <small>{rivalAll.approved + rivalAll.denied}/{rivalAll.total}</small>
    </button>
  </nav>

  {#if tab === "solo"}
    <div class="fighters">
      {#each names as n (n)}
        {@const c = groupCounts[n]}
        <button class="fighter" class:on={!everywhere && fighter === n} onclick={() => ((fighter = n), (everywhere = false))}>
          <img src={art[n]} alt="" loading="lazy" />
          <span class="fname">{short(n)}</span>
          {@render bar(c)}
          <small>{c.approved + c.denied}/{c.total}{c.rewritten ? ` · ${c.rewritten}↻` : ""}</small>
        </button>
      {/each}
    </div>
  {:else}
    <div class="matrix-wrap">
      <table class="matrix">
        <thead>
          <tr>
            <th></th>
            {#each names as b (b)}<th class="col"><span>{short(b)}</span></th>{/each}
          </tr>
        </thead>
        <tbody>
          {#each names as a (a)}
            <tr>
              <th class="row">{short(a)}</th>
              {#each names as b (b)}
                {#if a === b}
                  <td class="self"></td>
                {:else}
                  {@const k = pairKey(a, b)}
                  {@const c = groupCounts[k]}
                  <td>
                    <button
                      class="cell"
                      class:on={!everywhere && pair === k}
                      class:done={c.unreviewed + c.rewritten === 0 && c.denied === 0}
                      class:hasdenied={c.denied > 0}
                      class:hasrewritten={c.rewritten > 0}
                      title="{short(a)} vs {short(b)}"
                      onclick={() => ((pair = k), (everywhere = false))}
                    >
                      {c.approved + c.denied}/{c.total}
                    </button>
                  </td>
                {/if}
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="toolbar">
    <h2>
      {#if everywhere}
        Every {tab === "solo" ? "fighter" : "pairing"}
      {:else if tab === "solo"}
        {fighter}
      {:else}
        {pair.split("|").map(short).join(" vs ")}
      {/if}
      {#if !everywhere}
        {@render tally(groupCounts[tab === "solo" ? fighter : pair])}
      {/if}
    </h2>
    <div class="filters">
      {#each FILTERS as f (f)}
        <button class="f-{f}" class:on={filter === f} onclick={() => (filter = f)}>{f}</button>
      {/each}
      <label><input type="checkbox" bind:checked={everywhere} /> across all</label>
    </div>
    <div class="actions">
      <button onclick={approveRemaining} disabled={!loaded || !shown.some((i) => statusOf(i) === "unreviewed")}>
        Approve all remaining on this page
      </button>
      <button onclick={nextUnreviewed}>Next with work left →</button>
    </div>
  </div>

  <ul class="items">
    {#each shown as it (it.id)}
      {@const st = statusOf(it)}
      {@const v = review[it.id]}
      <li class="item s-{st}">
        <div class="lines">
          {#if it.solo}
            {#if everywhere}<div class="who">{short(it.group)}</div>{/if}
            <Bubble text={it.solo.text} />
          {:else if it.rival}
            {@const other = it.group.split("|").find((n) => n !== it.rival!.lead)!}
            <div class="exchange">
              <div class="speaker">
                <img src={art[it.rival.lead]} alt="" loading="lazy" />
                <span class="who">{short(it.rival.lead)} <em>scores</em></span>
              </div>
              <Bubble text={it.rival.line} />
            </div>
            <div class="exchange reply">
              <Bubble text={it.rival.reply} side="right" />
              <div class="speaker">
                <img src={art[other]} alt="" loading="lazy" />
                <span class="who">{short(other)}</span>
              </div>
            </div>
          {/if}
          {#if st === "rewritten" && v}
            <div class="was">Was: “{v.textAtReview}” ({v.status}{v.note ? `: ${v.note}` : ""})</div>
          {/if}
        </div>
        <div class="review">
          <code class="id">{it.id}</code>
          <div class="buttons">
            <button class="approve" class:on={v?.status === "approved" && st !== "rewritten"} disabled={!loaded} onclick={() => save([it], "approved")}>
              Approve
            </button>
            <button class="deny" class:on={v?.status === "denied" && st !== "rewritten"} disabled={!loaded} onclick={() => save([it], "denied")}>
              Deny
            </button>
            {#if v}
              <button class="clear" disabled={!loaded} onclick={() => save([it], "clear")} title="Clear verdict">↺</button>
            {/if}
          </div>
          <input
            class="note"
            placeholder="Note (optional)"
            bind:value={notes[it.id]}
            onblur={() => noteChanged(it)}
            onkeydown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          />
          <span class="state s-{st}">
            {st}
            {#if saving[it.id] === "saving"}· saving…{:else if saving[it.id] === "saved"}· saved{:else if saving[it.id] === "error"}· <b>save failed</b>{/if}
          </span>
        </div>
      </li>
    {:else}
      <li class="empty">Nothing here for “{filter}”.</li>
    {/each}
  </ul>
</div>

<style>
  .page {
    min-height: 100vh;
    background:
      repeating-linear-gradient(-62deg, transparent 0 46px, rgb(255 255 255 / 0.035) 46px 48px),
      var(--field);
    color: var(--text, #fff);
    font: 15px var(--font-text);
    padding: 0 24px 80px;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 -24px;
    padding: 14px 24px;
    background: var(--field-deep);
    border-bottom: var(--outline) solid var(--ink);
  }
  h1 {
    margin: 0;
    font: 900 italic 34px var(--font-display);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .kana {
    font-size: 18px;
    color: var(--gold);
    margin-left: 8px;
  }
  .overall {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 700;
  }
  .overall .bar {
    width: 220px;
  }
  .error {
    background: var(--red);
    color: #fff;
    padding: 8px 12px;
    font-weight: 700;
  }

  button {
    font: inherit;
    padding: 5px 12px;
    background: #111a44;
    color: #fff;
    border: 2px solid #000;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  button.on {
    background: var(--gold);
    color: #000;
  }

  .tabs {
    display: flex;
    gap: 8px;
    margin: 18px 0 12px;
  }
  .tabs button {
    font: 900 italic 22px var(--font-display);
    text-transform: uppercase;
    padding: 6px 22px;
    box-shadow: 4px 4px 0 #000;
  }
  .tabs small {
    font: 600 13px var(--font-text);
    opacity: 0.75;
  }

  /* Progress bar: approved / denied / rewritten / unreviewed. */
  .bar {
    display: flex;
    height: 8px;
    width: 100%;
    background: #000;
    border: 1px solid #000;
  }
  .bar i {
    display: block;
  }
  .bar .approved { background: var(--green); }
  .bar .denied { background: var(--red); }
  .bar .rewritten { background: #c46cff; }
  .bar .unreviewed { background: #2c3a80; }
  .tally {
    display: inline-flex;
    gap: 8px;
    font: 700 14px var(--font-text);
    font-style: normal;
    text-transform: none;
    vertical-align: middle;
  }
  .t-approved { color: var(--green); }
  .t-denied { color: #ff7a72; }
  .t-rewritten { color: #d7a0ff; }
  .t-left { color: var(--on-field-soft); }

  .fighters {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
  }
  .fighter {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    padding: 6px;
    background: var(--paper);
    color: #000;
    box-shadow: 4px 4px 0 #000;
  }
  .fighter.on {
    background: var(--gold);
    outline: 3px solid #fff;
  }
  .fighter img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    object-position: top;
    background: var(--field-deep);
  }
  .fname {
    font: 900 italic 15px var(--font-display);
    text-transform: uppercase;
    font-stretch: 75%;
  }
  .fighter small {
    font-size: 12px;
  }

  .matrix-wrap {
    overflow-x: auto;
  }
  .matrix {
    border-collapse: collapse;
    font-size: 12px;
  }
  .matrix th {
    font-weight: 700;
    color: var(--on-field-soft);
    white-space: nowrap;
  }
  .matrix th.row {
    text-align: right;
    padding-right: 8px;
  }
  .matrix th.col {
    height: 92px;
    vertical-align: bottom;
  }
  .matrix th.col span {
    display: inline-block;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }
  .matrix td {
    padding: 2px;
  }
  .matrix td.self {
    background: rgb(0 0 0 / 0.3);
  }
  .cell {
    width: 54px;
    padding: 4px 0;
    font-size: 12px;
    background: #111a44;
  }
  .cell.done { background: color-mix(in srgb, var(--green) 70%, #000); }
  .cell.hasdenied { background: color-mix(in srgb, var(--red) 70%, #000); }
  .cell.hasrewritten { background: #7a34b0; }
  .cell.on {
    background: var(--gold);
    color: #000;
    outline: 2px solid #fff;
  }

  .toolbar {
    position: sticky;
    top: 0;
    z-index: 4;
    margin: 18px -24px 0;
    padding: 10px 24px;
    background: rgb(14 26 82 / 0.95);
    border-top: 2px solid #000;
    border-bottom: 2px solid #000;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 20px;
  }
  .toolbar h2 {
    margin: 0;
    font: 900 italic 24px var(--font-display);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .filters,
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .actions {
    margin-left: auto;
  }
  .filters button {
    text-transform: capitalize;
    font-size: 13px;
  }

  .items {
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }
  .item {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 16px;
    padding: 12px 16px;
    background: rgb(0 0 0 / 0.22);
    border: 2px solid #000;
    border-left: 8px solid #2c3a80;
  }
  .item.s-approved { border-left-color: var(--green); background: rgb(25 178 90 / 0.12); }
  .item.s-denied { border-left-color: var(--red); background: rgb(230 51 41 / 0.14); }
  .item.s-rewritten {
    border-left-color: #c46cff;
    background: rgb(196 108 255 / 0.18);
    outline: 2px dashed #c46cff;
  }
  .lines {
    min-width: 0;
  }
  .exchange {
    display: flex;
    align-items: flex-end;
    gap: 10px;
  }
  .exchange.reply {
    justify-content: flex-end;
  }
  .speaker {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 76px;
    flex: none;
  }
  .speaker img {
    width: 56px;
    height: 56px;
    object-fit: cover;
    object-position: top;
    border: 2px solid #000;
    background: var(--field-deep);
  }
  .who {
    font: 700 12px var(--font-text);
    color: var(--on-field-soft);
    text-align: center;
  }
  .who em {
    color: var(--gold);
    font-style: normal;
  }
  .was {
    margin-top: 6px;
    font-size: 13px;
    color: #e3c4ff;
  }
  .review {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .id {
    font-size: 11px;
    color: var(--on-field-soft);
  }
  .buttons {
    display: flex;
    gap: 6px;
  }
  .approve.on { background: var(--green); color: #000; }
  .deny.on { background: var(--red); color: #fff; }
  .approve:hover:not(:disabled) { border-color: var(--green); }
  .deny:hover:not(:disabled) { border-color: var(--red); }
  .note {
    font: inherit;
    font-size: 13px;
    padding: 4px 8px;
    border: 2px solid #000;
    background: #fff;
    color: #000;
  }
  .state {
    font-size: 12px;
    text-transform: capitalize;
    color: var(--on-field-soft);
  }
  .state.s-approved { color: var(--green); }
  .state.s-denied { color: #ff7a72; }
  .state.s-rewritten { color: #d7a0ff; font-weight: 700; }
  .empty {
    padding: 24px;
    color: var(--on-field-soft);
  }
  @media (max-width: 760px) {
    .item {
      grid-template-columns: 1fr;
    }
  }
</style>
