<script lang="ts">
  import { START_BALANCE } from "$lib/odds";
  import { cleanName } from "$lib/betting";
  import type { Me, PBPerson, Role } from "$lib/people";
  import type { StarterPick } from "$lib/starters";

  // Signing in on the phone page: "I'm playing" (pick your starting fighter,
  // or type your name if you're new) or "I'm watching" (a name, to wager).
  // After the groups are drawn it's too late to play, so it's a name only.
  // The server (/live/me) checks everything and hands back a token that
  // this phone keeps.
  let {
    starters,
    people,
    drawn,
    onsignin,
  }: {
    starters: StarterPick[];
    people: PBPerson[];
    drawn: boolean;
    onsignin: (me: Me, playing: boolean) => void;
  } = $props();

  let step = $state<"choose" | Role>("choose");
  const shown = $derived(drawn ? "spectator" : step);
  let name = $state("");
  let busy = $state(false);
  let problem = $state("");

  // A starter someone has signed in as on their phone can't be picked. One
  // the organiser added by hand still can: picking it claims them.
  const onPhone = $derived(new Set(people.filter((p) => p.phone && p.starter).map((p) => p.starter)));

  async function send(ask: { role: Role; name?: string; starter?: string }) {
    busy = true;
    problem = "";
    try {
      const res = await fetch("/live/me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "signin", ...ask }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) problem = body.message ?? "Couldn't sign in. Try again.";
      else onsignin(body as Me, ask.role === "player" || !!people.find((p) => p.id === body.id && p.role === "player"));
    } catch {
      problem = "No connection. Try again.";
    } finally {
      busy = false;
    }
  }

  function typed(e: SubmitEvent, role: Role) {
    e.preventDefault();
    const clean = cleanName(name);
    if (!clean) problem = "Pick a name of 2 to 16 letters.";
    else send({ role, name: clean });
  }

  function choose(r: "choose" | Role) {
    step = r;
    problem = "";
  }
</script>

<section class="signin">
  <h2 class="lv-h">Sign in</h2>

  {#if shown === "choose"}
    <p class="lv-note">
      Playing today? Sign in to get on the list. Watching? Sign in to wager: everyone starts with
      ${START_BALANCE.toLocaleString("en-IE")} of play money.
    </p>
    <div class="choose">
      <button class="big" onclick={() => choose("player")}>I'm playing</button>
      <button class="big" onclick={() => choose("spectator")}>I'm watching</button>
    </div>
  {:else if shown === "player"}
    <p class="lv-note">Tap your fighter.</p>
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    <div class="grid">
      {#each starters as s (s.name)}
        {@const taken = onPhone.has(s.name)}
        <button class="card" disabled={busy || taken} onclick={() => send({ role: "player", starter: s.name })}>
          <span class="pic">
            {#if s.image}<img src="/starter-fighters/{s.image}" alt="" loading="lazy" />{:else}<span class="none">?</span>{/if}
          </span>
          <span class="fighter">{s.name}</span>
          <span class="who">{taken ? "Signed in" : s.player}</span>
        </button>
      {/each}
    </div>
    <form class="lv-slab form" onsubmit={(e) => typed(e, "player")}>
      <label for="play-name">New here? Your name</label>
      <input id="play-name" bind:value={name} maxlength="16" autocomplete="nickname" />
      <button class="go" disabled={busy}>{busy ? "Signing in…" : "Sign in to play"}</button>
    </form>
    <button class="back" onclick={() => choose("choose")}>Back</button>
  {:else}
    {#if drawn}
      <p class="lv-note">
        Sign in to wager: everyone starts with ${START_BALANCE.toLocaleString("en-IE")} of play money. Back a blader to
        win a match: the favourite pays less, the underdog pays more.
      </p>
    {/if}
    <form class="lv-slab form" onsubmit={(e) => typed(e, "spectator")}>
      <label for="watch-name">Your name</label>
      <input id="watch-name" bind:value={name} maxlength="16" autocomplete="nickname" placeholder="e.g. Spin Doctor" />
      {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
      <button class="go" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    {#if !drawn}<button class="back" onclick={() => choose("choose")}>Back</button>{/if}
  {/if}
</section>

<style>
  .signin {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .signin .lv-note {
    margin-bottom: 0;
  }
  .choose {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .big,
  .go {
    min-height: 56px;
    font-family: var(--font-display);
    font-size: 1.3rem;
    text-transform: uppercase;
    background: var(--gold);
    color: var(--ink);
    border: 2px solid var(--ink);
    box-shadow: 3px 3px 0 var(--ink);
    cursor: pointer;
  }
  .big:disabled,
  .go:disabled {
    opacity: 0.6;
  }
  /* Starting fighters: three across on a phone. */
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    padding: 0 0 6px;
    background: var(--paper);
    color: var(--ink);
    border: 2px solid var(--ink);
    box-shadow: 3px 3px 0 var(--ink);
    font: inherit;
    cursor: pointer;
    min-width: 0;
  }
  .card:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .pic {
    aspect-ratio: 1;
    background: var(--field-deep);
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .pic img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }
  .none {
    font-family: var(--font-display);
    font-size: 2rem;
    color: var(--on-field-soft);
  }
  .fighter {
    font-family: var(--font-display);
    font-size: 0.95rem;
    line-height: 1.1;
    padding: 4px 4px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .who {
    font-size: 0.8rem;
    color: var(--ink-soft);
    padding: 0 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
  }
  label {
    font-stretch: 75%;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.85rem;
  }
  input {
    min-height: 48px;
    padding: 0 12px;
    font: inherit;
    font-size: 1.1rem;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
  }
  .problem {
    color: var(--red);
    font-weight: 700;
    background: var(--paper);
    padding: 8px 10px;
    border: 2px solid var(--ink);
  }
  .form .problem {
    padding: 0;
    border: 0;
  }
  .back {
    align-self: flex-start;
    min-height: 44px;
    padding: 0 6px;
    background: none;
    border: 0;
    color: var(--on-field-soft);
    font: inherit;
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
