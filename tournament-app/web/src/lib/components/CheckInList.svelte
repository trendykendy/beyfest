<script lang="ts">
  import { enhance } from "$app/forms";
  import { playersOf, type PBPerson } from "$lib/people";
  import type { StarterPick } from "$lib/starters";
  import StarterPicker from "./StarterPicker.svelte";

  // Before the draw: everyone signed in, as players or spectators. Players
  // sign in on their phones; the organiser can add walk-ins and starting
  // fighters by hand, fix names, move people between the lists and remove
  // them. The groups are drawn from the players.
  let { people, starters }: { people: PBPerson[]; starters: StarterPick[] } = $props();

  const players = $derived(playersOf(people));
  const watching = $derived(people.filter((p) => p.role === "spectator"));

  let editing = $state<string | null>(null); // whose name is being fixed
  let addName = $state("");

  // Forms here refresh the page without resetting the others.
  const keep = () => {
    return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
      await update({ reset: false });
      editing = null;
    };
  };
</script>

<div class="checkin">
  <div class="head">
    <span class="field">Bladesworn <b>{players.length}</b></span>
    <StarterPicker {starters} {people} />
  </div>

  {#snippet row(p: PBPerson)}
    <li>
      {#if editing === p.id}
        <form class="rename" method="POST" action="?/checkinRename" use:enhance={keep}>
          <input type="hidden" name="id" value={p.id} />
          <!-- svelte-ignore a11y_autofocus -->
          <input name="name" value={p.name} maxlength="16" autofocus aria-label="New name for {p.name}" />
          <button class="mini">Save</button>
          <button class="mini" type="button" onclick={() => (editing = null)}>Cancel</button>
        </form>
      {:else}
        <span class="who">
          <span class="nm">{p.name}</span>
          {#if p.starter && p.starter !== p.name}<span class="ft">{p.starter}</span>{/if}
          <span class="how" title={p.phone ? "Signed in on their phone" : "Added here"}>{p.phone ? "phone" : "added"}</span>
        </span>
        <span class="acts">
          <button class="mini" type="button" onclick={() => (editing = p.id)}>Rename</button>
          <form method="POST" action="?/checkinRole" use:enhance={keep}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="role" value={p.role === "player" ? "spectator" : "player"} />
            <button class="mini">{p.role === "player" ? "Watching" : "Playing"}</button>
          </form>
          <form
            method="POST"
            action="?/checkinRemove"
            use:enhance={({ cancel }) => {
              if (!confirm(`Take ${p.name} off the list?`)) return cancel();
              return keep();
            }}
          >
            <input type="hidden" name="id" value={p.id} />
            <button class="mini danger">Remove</button>
          </form>
        </span>
      {/if}
    </li>
  {/snippet}

  {#if players.length}
    <ol class="list">
      {#each players as p (p.id)}{@render row(p)}{/each}
    </ol>
  {:else}
    <p class="empty">Nobody yet. The Bladesworn sign in on their phones from the QR code on the TV, or add them here.</p>
  {/if}

  <form
    class="add"
    method="POST"
    action="?/checkinAdd"
    use:enhance={() => {
      return async ({ result, update }) => {
        await update({ reset: false });
        if (result.type === "success") addName = "";
      };
    }}
  >
    <input name="name" bind:value={addName} maxlength="16" placeholder="Add someone" aria-label="Add one of the Bladesworn by name" />
    <button class="mini" disabled={addName.trim().length < 2}>Add</button>
  </form>

  {#if watching.length}
    <p class="field sub">Watching <b>{watching.length}</b></p>
    <ul class="list">
      {#each watching as p (p.id)}{@render row(p)}{/each}
    </ul>
  {/if}

  {#if people.length}
    <form
      class="clear"
      method="POST"
      action="?/checkinClear"
      use:enhance={({ cancel }) => {
        if (!confirm(`Clear all ${people.length} sign-ins? Everyone will have to sign in again.`)) return cancel();
        return keep();
      }}
    >
      <button class="mini danger">Clear sign-ins</button>
    </form>
  {/if}
</div>

<style>
  .checkin {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .field {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.85rem;
  }
  .field b {
    display: inline-block;
    min-width: 2em;
    margin-left: 6px;
    padding: 0 6px;
    text-align: center;
    background: var(--gold);
    border: 2px solid var(--ink);
  }
  .sub {
    margin-top: 6px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
  }
  ol.list {
    counter-reset: n;
  }
  .list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    padding: 6px 10px;
    border-bottom: 1px solid rgb(0 0 0 / 0.12);
    min-height: 48px;
  }
  .list li:last-child {
    border-bottom: 0;
  }
  ol.list li::before {
    counter-increment: n;
    content: counter(n);
    width: 1.6em;
    font-weight: 700;
    color: var(--ink-soft);
  }
  .who {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .nm {
    font-weight: 700;
  }
  .ft {
    color: var(--ink-soft);
    font-size: 0.9rem;
  }
  .how {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-soft);
    border: 1px solid currentColor;
    padding: 0 4px;
  }
  .acts,
  .rename {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .rename {
    flex: 1;
  }
  .rename input,
  .add input {
    flex: 1;
    min-width: 0;
    min-height: 40px;
    padding: 0 10px;
    font: inherit;
    border: 2px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
  }
  .mini {
    min-height: 40px;
    padding: 0 10px;
    font: inherit;
    font-weight: 700;
    font-size: 0.85rem;
    background: var(--paper);
    color: var(--ink);
    border: 2px solid var(--ink);
    cursor: pointer;
  }
  .mini:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .mini.danger {
    color: var(--red);
  }
  .add {
    display: flex;
    gap: 8px;
  }
  .empty {
    padding: 12px;
    border: 2px dashed var(--ink-soft);
    color: var(--ink-soft);
  }
  .clear {
    align-self: flex-end;
  }
</style>
