<script lang="ts">
  import { onMount, tick } from "svelte";
  import { invalidateAll, replaceState } from "$app/navigation";
  import { pickStructure } from "@beyfest/engine";
  import { liveUpdates } from "$lib/pbBrowser";
  import { EVENT } from "$lib/config";
  import { ARENA_NAME, EVENT_NAME, PHONE, STAGES } from "$lib/terms";
  import { loadFollow, resolveFollow, saveFollow, type Follow } from "$lib/follow";
  import { loadMe, saveMe, type Me } from "$lib/people";
  import { nameMap, type PBPlayer } from "$lib/view";
  import NowTab from "$lib/components/live/NowTab.svelte";
  import GroupsTab from "$lib/components/live/GroupsTab.svelte";
  import BracketTab from "$lib/components/live/BracketTab.svelte";
  import FollowPicker from "$lib/components/live/FollowPicker.svelte";
  import YourNext from "$lib/components/live/YourNext.svelte";
  import BetsTab from "$lib/components/live/BetsTab.svelte";
  import SignIn from "$lib/components/live/SignIn.svelte";
  import SignedIn from "$lib/components/live/SignedIn.svelte";

  // The phone page, reached from the QR code on the TV. Spectators browse it
  // themselves (unlike the TV, which the organiser drives): what's on now,
  // the groups, the bracket, and one blader followed on this phone.
  let { data } = $props();

  const structure = $derived(data.tournament ? pickStructure(data.tournament.structureKey) : null);
  const names = $derived(nameMap(data.players));
  const groupCount = $derived(data.groups.length);
  const hasKnockout = $derived(data.matches.some((m) => m.stage !== "group"));

  // ── Tabs ────────────────────────────────────────────────────────────
  // Kept in the address (#groups), so a reload or a shared link lands on the
  // same tab. Bracket only appears once the knockout exists.
  type Tab = "now" | "groups" | "bracket" | "bets" | "follow";
  // label: on the tab bar (short, so five fit a small phone); title and sub:
  // in the top bar while the tab is open.
  const TABS: { key: Tab; label: string; title: string; sub: string }[] = [
    { key: "now", label: "Herald", title: PHONE.now, sub: `live from ${ARENA_NAME}` },
    { key: "groups", label: "Circles", title: PHONE.groups, sub: STAGES.groups },
    { key: "bracket", label: "Paths", title: PHONE.bracket, sub: "swipe for later rounds" },
    { key: "bets", label: PHONE.bets, title: PHONE.bets, sub: "gold won and lost" },
    { key: "follow", label: PHONE.follow, title: `Your ${PHONE.follow}`, sub: "whose matches to watch for" },
  ];
  const tabs = $derived(TABS.filter((t) => t.key !== "bracket" || hasKnockout));
  let tab = $state<Tab>("now");
  // A saved #bracket from before the knockout existed falls back to Now.
  const shownTab = $derived(tabs.some((t) => t.key === tab) ? tab : "now");
  // What the top bar says: the open tab, or The Gathering before the draw.
  const heading = $derived.by(() => {
    const t = TABS.find((x) => x.key === shownTab)!;
    return data.tournament ? { title: t.title, sub: t.sub } : { title: "The Gathering", sub: "answer the summons" };
  });

  async function pick(t: Tab) {
    if (t === tab) return;
    tab = t;
    // Replace rather than push, so Back leaves the page instead of stepping
    // through every tab tapped.
    replaceState(`#${t}`, {});
    await tick();
    window.scrollTo(0, 0);
  }

  // ── Follow a blader ─────────────────────────────────────────────────
  // Only the browser knows (localStorage), so it's read on mount.
  let follow = $state<Follow | null>(null);
  const followed = $derived(resolveFollow(follow, data.players));
  const followId = $derived(followed?.id ?? "");

  function setFollow(p: PBPlayer | null) {
    follow = p ? { id: p.id, name: p.name } : null;
    saveFollow(follow);
  }
  // Found by name after the tournament was recreated: remember the new id.
  $effect(() => {
    if (followed && follow && followed.id !== follow.id) setFollow(followed);
  });

  // ── Signing in ──────────────────────────────────────────────────────
  // Who this phone signed in as (name and token), also only in the browser.
  // It's who wagers from this phone; a player follows themselves.
  let me = $state<Me | null>(null);

  // A player follows themselves. Before the draw there's no player record
  // yet, so the follow holds the name, and resolveFollow finds them by it
  // once the groups exist.
  function followMe(m: Me) {
    follow = { id: m.id, name: m.name };
    saveFollow(follow);
  }

  async function signedIn(m: Me, playing: boolean) {
    saveMe(m);
    if (playing) followMe(m);
    // Load the new person before showing them, so the page never flashes
    // back to the sign-in form.
    await invalidateAll();
    me = m;
  }
  function roleChanged(playing: boolean) {
    if (playing && me) followMe(me);
  }
  function signedOut() {
    saveMe(null);
    me = null;
  }
  // Signed in as someone the server still lists. Removed by the organiser,
  // or sign-ins cleared: the sign-in form shows again. The saved sign-in
  // isn't wiped here, since the data can briefly lag just after signing in
  // (two refreshes crossing); signing in again replaces it.
  const meHere = $derived(me && data.people.some((p) => p.id === me!.id) ? me : null);

  let online = $state(true);
  onMount(() => {
    follow = loadFollow();
    me = loadMe();
    const fromHash = location.hash.slice(1);
    if (TABS.some((t) => t.key === fromHash)) tab = fromHash as Tab;
    return liveUpdates(
      ["tournaments", "groups", "players", "matches", "fighters", "tv_state", "people", "bets", "loans", "royales"],
      () => invalidateAll(),
      { everyMs: 30_000, onStatus: (up) => (online = up) },
    );
  });
</script>

<svelte:head>
  <title>{EVENT_NAME} · Live</title>
</svelte:head>

<div class="live">
  <header class="top">
    <div class="top-in">
      <img class="brand" src="/logo-tetrafatalis.webp" alt={EVENT_NAME} />
      {#if !online}
        <span class="offline" role="status">Reconnecting</span>
      {:else}
        <span class="brand-sub"><b>{heading.title}</b><span>{heading.sub}</span></span>
      {/if}
    </div>
  </header>

  <main class="body" class:with-tabs={!!data.tournament}>
    {#if !data.tournament}
      <section class="lv-slab waiting">
        <header class="lv-slab-head"><h2>The Circles are not drawn yet</h2></header>
        <p>
          Live scores, the Circles and the Paths appear here as soon as the Circles are drawn. Keep this page open:
          it updates by itself.
        </p>
        <p class="when">{EVENT.date} · {EVENT.place}</p>
      </section>
      {#if !data.betting}
        <p class="lv-note">Signing in is closed right now.</p>
      {:else if meHere}
        <SignedIn me={meHere} people={data.people} onrole={roleChanged} onleave={signedOut} />
      {:else}
        <SignIn starters={data.starters} people={data.people} drawn={false} onsignin={signedIn} />
      {/if}
    {:else}
      {#if followed}
        <YourNext
          player={followed}
          matches={data.matches}
          {names}
          {groupCount}
          fighters={data.fighters}
          pbUrl={data.pbUrl}
          nextCode={data.next}
        />
      {/if}

      <div class="tab">
        {#if shownTab === "now"}
          <NowTab matches={data.matches} {names} {groupCount} {followId} nextCode={data.next} royale={data.royale} />
        {:else if shownTab === "groups"}
          <GroupsTab
            groups={data.groups}
            players={data.players}
            matches={data.matches}
            {names}
            knockoutType={structure?.knockoutType ?? ""}
            {followId}
            nextCode={data.next}
          />
        {:else if shownTab === "bracket"}
          <BracketTab
            matches={data.matches}
            players={data.players}
            {names}
            {groupCount}
            {structure}
            {followId}
            nextCode={data.next}
          />
        {:else if shownTab === "bets"}
          <BetsTab
            matches={data.matches}
            players={data.players}
            {names}
            bettors={data.bettors}
            bets={data.bets}
            loans={data.loans}
            people={data.people}
            me={meHere}
            enabled={data.betting}
            nextCode={data.next}
            onsignin={signedIn}
            onlost={signedOut}
          />
        {:else}
          <FollowPicker players={data.players} fighters={data.fighters} {followId} onpick={setFollow} />
        {/if}
      </div>
    {/if}
  </main>

  {#if data.tournament}
    <nav class="tabs" aria-label="Sections">
      <div class="tabs-in">
        {#each tabs as t (t.key)}
          <button class="tb" class:on={shownTab === t.key} aria-current={shownTab === t.key ? "page" : undefined} onclick={() => pick(t.key)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {#if t.key === "now"}
                <!-- A herald's horn -->
                <path d="M3 10.2v3.6l3 .5V9.7zM7.4 9.4v5.2l11.2 4.2V5.2zM20 7.5v9l1.6.6V6.9z" />
              {:else if t.key === "groups"}
                <!-- Rings: the Circles -->
                <path class="line" d="M8.5 12a4.5 4.5 0 1 0 0-.01zM15.5 12a4.5 4.5 0 1 0 0-.01z" transform="translate(-4.5 0)" />
              {:else if t.key === "bracket"}
                <!-- Paths that join -->
                <path class="line" d="M3 5.5h6l4 6.5h8M3 18.5h6l4-6.5" />
              {:else if t.key === "bets"}
                <!-- A coin -->
                <circle cx="12" cy="12" r="9.5" />
                <path class="cut" d="M12 6v12M15 8.5c-.8-.9-1.8-1.3-3-1.3-1.7 0-3 .9-3 2.3 0 3.2 6 1.6 6 4.9 0 1.4-1.3 2.4-3 2.4-1.3 0-2.4-.5-3.2-1.4" />
              {:else}
                <!-- A banner on its pole -->
                <path d="M5 2.5h1.8v19H5zM8 4h11l-2.6 4L19 12H8z" />
              {/if}
            </svg>
            <span>{t.label}</span>
          </button>
        {/each}
      </div>
    </nav>
  {/if}
</div>

<style>
  /* Phone first: designed at 360–430px wide, kept to a phone-width column
     (480px) on anything bigger.

     The parchment look. The tab components were written against the old
     look's colour and font names (--field, --paper, --ink, --font-display…),
     so those names are given parchment values here and every component
     under .live follows. Dark stone bars top and bottom and carved Cinzel
     capitals tie it to the TV. */
  .live {
    --col: 480px;
    --gutter: 16px;
    --tabs-h: 62px;

    --field: #efe2c4; /* the page */
    --field-deep: #e2d0a6; /* a shade down, for quiet controls */
    --field-line: #c9b48a; /* rules and quiet borders */
    --paper: #fffaf0; /* cards */
    --ink: #33230f; /* text, and the dark of tags and edges */
    --ink-soft: #7a6447; /* secondary text on a card */
    --on-field-soft: #7a6447; /* secondary text on the page */
    --gold: #eab13a;
    --red: #b4551a; /* in battle: torch orange, not alarm red */
    --green: #4d7a3a;
    --outline: 2px;
    --font-display: var(--tf-font-carved);
    --font-text: var(--tf-font-text);
    /* The Paths, dark enough to read on parchment. */
    --wb: #a8780f;
    --mb: #5d6a78;
    --lb: #9a4f35;

    min-height: 100dvh;
    background: var(--field) radial-gradient(ellipse 120% 60% at 50% 0, #f8efd6, #e6d5ad 85%) fixed;
    color: var(--ink);
    font-family: var(--tf-font-text);
    font-size: 17px;
  }
  /* Headings were black italic capitals; Cinzel needs its own weight. */
  .live :global(h2),
  .live :global(h3) {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    letter-spacing: 0.02em;
  }

  /* ── Header: dark stone, the logo, and which tab this is ─────────── */
  .top {
    position: sticky;
    top: 0;
    z-index: 20;
    background: linear-gradient(180deg, #17181d, #0a0a0d);
    border-bottom: 4px solid var(--gold);
    padding-top: env(safe-area-inset-top);
  }
  .top-in {
    max-width: var(--col);
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 60px;
    padding: 0 var(--gutter);
    padding-left: max(var(--gutter), env(safe-area-inset-left));
    padding-right: max(var(--gutter), env(safe-area-inset-right));
  }
  .brand {
    display: block;
    height: 48px;
    width: auto;
  }
  .brand-sub {
    margin-left: auto;
    display: flex;
    flex-direction: column;
    text-align: right;
    line-height: 1.2;
    min-width: 0;
  }
  .brand-sub b {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #ffe6ad;
    white-space: nowrap;
  }
  .brand-sub span {
    font-size: 0.8rem;
    color: #b9ab8c;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .offline {
    margin-left: auto;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: linear-gradient(180deg, #c8651c, #7a3408);
    color: #fff;
    padding: 4px 10px;
    border-radius: 3px;
  }

  /* ── Body ───────────────────────────────────────────────────────── */
  .body {
    max-width: var(--col);
    margin: 0 auto;
    padding: 16px var(--gutter) 32px;
    padding-left: max(var(--gutter), env(safe-area-inset-left));
    padding-right: max(var(--gutter), env(safe-area-inset-right));
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  /* Room for the tab bar (and the home bar under it) at the bottom. */
  .body.with-tabs {
    padding-bottom: calc(var(--tabs-h) + env(safe-area-inset-bottom) + 28px);
  }
  .tab {
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .waiting p {
    padding: 12px 14px 0;
    color: var(--ink);
  }
  .waiting .when {
    padding-bottom: 14px;
    font-weight: 700;
    color: var(--ink-soft);
  }

  /* ── Tab bar: dark stone, the open tab in gold ───────────────────── */
  .tabs {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    background: linear-gradient(180deg, #17181d, #0a0a0d);
    border-top: 4px solid var(--gold);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .tabs-in {
    max-width: var(--col);
    margin: 0 auto;
    display: flex;
  }
  .tb {
    flex: 1;
    min-width: 0;
    min-height: var(--tabs-h);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    background: none;
    border: 0;
    color: #8d8577;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tb svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
  }
  .tb svg .cut {
    fill: none;
    stroke: #0a0a0d;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .tb.on svg .cut {
    stroke: #e0a52c;
  }
  .tb svg .line {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .tb.on {
    color: #2a1606;
    background: linear-gradient(180deg, #ffe08a, #c98a1c);
  }

  /* ── Shared by the tab components (lv- prefixed, so global is safe) ── */
  /* Section heading: carved capitals with a rule running off to the right. */
  :global(.lv-h) {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.2rem;
    text-transform: uppercase;
    color: #5a3a0c;
    margin-bottom: 10px;
  }
  :global(.lv-h)::after {
    content: "";
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, var(--field-line), transparent);
  }
  /* A card: pale vellum with a ruled edge. */
  :global(.lv-slab) {
    background: rgba(255, 252, 240, 0.66);
    color: var(--ink);
    border: 2px solid var(--field-line);
    border-radius: 6px;
    box-shadow: 0 2px 0 rgba(90, 58, 12, 0.25);
    overflow: hidden;
  }
  :global(.lv-slab-head) {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    background: linear-gradient(180deg, #2f3139, #15161b);
    color: #ffe6ad;
    border-bottom: 3px solid var(--gold);
    padding: 8px 12px 7px;
  }
  :global(.lv-slab-head h2) {
    font-size: 1.15rem;
    text-transform: uppercase;
  }
  :global(.lv-slab-head span) {
    font-size: 0.85rem;
    white-space: nowrap;
    color: #b9ab8c;
  }
  :global(.lv-note) {
    color: var(--on-field-soft);
    font-size: 1rem;
    line-height: 1.4;
    margin-bottom: 12px;
  }
  /* Chips to switch Circle / Path: a joined row, the chosen one in gold.
     Up to four share one row, equal widths; they'd wrap rather than scroll. */
  :global(.lv-chips) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  :global(.lv-chip) {
    flex: 1 1 0;
    min-width: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 6px;
    white-space: nowrap;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #b9ab8c;
    background: #1d1f26;
    border: 2px solid #1c0c04;
    border-radius: 6px;
    cursor: pointer;
  }
  :global(.lv-chip.on) {
    color: #2a1606;
    background: linear-gradient(180deg, #ffe08a, #c98a1c);
  }
  :global(.lv-dot) {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ff9d2e;
    box-shadow: 0 0 0 2px #1c0c04;
  }
  :global(.lv-star) {
    color: var(--gold);
    font-size: 0.9em;
    -webkit-text-stroke: 1px var(--ink);
  }
</style>
