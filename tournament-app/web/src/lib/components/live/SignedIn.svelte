<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { playersOf, type Me, type PBPerson, type Role } from "$lib/people";

  // Before the groups are drawn: who this phone signed in as (switch between
  // playing and watching, or sign out) and everyone signed in so far.
  let {
    me,
    people,
    onrole,
    onleave,
  }: {
    me: Me;
    people: PBPerson[];
    onrole: (playing: boolean) => void;
    onleave: () => void; // signed out, or this phone's sign-in is gone
  } = $props();

  const mine = $derived(people.find((p) => p.id === me.id));
  const players = $derived(playersOf(people));
  const watching = $derived(people.length - players.length);
  let busy = $state(false);
  let problem = $state("");

  async function ask(action: "role" | "leave", role?: Role) {
    busy = true;
    problem = "";
    try {
      const res = await fetch("/live/me", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, id: me.id, token: me.token, role }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && action === "role") {
        await invalidateAll();
        onrole(role === "player");
      } else if (res.ok || res.status === 410) onleave();
      else problem = body.message ?? "That didn't work. Try again.";
    } catch {
      problem = "No connection. Try again.";
    } finally {
      busy = false;
    }
  }
</script>

{#if mine}
  <section class="lv-slab you">
    <header class="lv-slab-head"><h2>You're in</h2></header>
    <div class="you-body">
      <p class="you-name">{mine.name}</p>
      <p class="you-role">
        {mine.role === "player" ? (mine.starter ? `Playing as ${mine.starter}` : "Playing") : "Watching"}
      </p>
      {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
      <div class="you-actions">
        {#if mine.role === "player"}
          <button disabled={busy} onclick={() => ask("role", "spectator")}>I'm only watching</button>
        {:else}
          <button disabled={busy} onclick={() => ask("role", "player")}>I'm playing</button>
        {/if}
        <button disabled={busy} onclick={() => ask("leave")}>Sign out</button>
      </div>
    </div>
  </section>
{/if}

<section>
  <h2 class="lv-h">Here so far</h2>
  {#if players.length}
    <ol class="lv-slab here">
      {#each players as p (p.id)}
        <li class:me={p.id === me.id}>
          <span class="nm">{p.name}</span>
          {#if p.starter && p.starter !== p.name}<span class="ft">{p.starter}</span>{/if}
        </li>
      {/each}
    </ol>
  {:else}
    <p class="lv-note">No bladers signed in yet.</p>
  {/if}
  {#if watching}<p class="lv-note watching">+ {watching} watching</p>{/if}
</section>

<style>
  .you-body {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .you-name {
    font-family: var(--font-display);
    font-weight: 900;
    font-size: 1.8rem;
    line-height: 1;
  }
  .you-role {
    font-weight: 700;
    color: var(--ink-soft);
  }
  .you-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .you-actions button {
    min-height: 44px;
    padding: 0 14px;
    font: inherit;
    font-weight: 700;
    background: var(--paper);
    color: var(--ink);
    border: 2px solid var(--ink);
    cursor: pointer;
  }
  .you-actions button:disabled {
    opacity: 0.6;
  }
  .problem {
    color: var(--red);
    font-weight: 700;
  }
  .here {
    list-style: none;
    margin: 0;
    padding: 4px 0;
  }
  .here li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--rule, rgba(0, 0, 0, 0.12));
  }
  .here li:last-child {
    border-bottom: 0;
  }
  .here li.me {
    background: var(--gold);
  }
  .nm {
    font-weight: 700;
  }
  .ft {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .watching {
    margin-top: 8px;
  }
</style>
