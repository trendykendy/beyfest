<script lang="ts">
  import { enhance } from "$app/forms";

  let { data, form } = $props();

  type Clip = (typeof data.sections)[number]["clips"][number];
  type Filter = "all" | "redo" | "unreviewed" | "ok" | "candidates";

  const FILTERS: { key: Filter; label: string; test: (c: Clip) => boolean }[] = [
    { key: "all", label: "All", test: () => true },
    { key: "redo", label: "To redo", test: (c) => c.mark?.status === "redo" },
    { key: "unreviewed", label: "Not reviewed", test: (c) => !c.mark?.status },
    { key: "ok", label: "OK", test: (c) => c.mark?.status === "ok" },
    { key: "candidates", label: "Candidates to hear", test: (c) => c.log.candidates.length > 0 },
  ];

  let filter = $state<Filter>("all");
  const allClips = $derived(data.sections.flatMap((s) => s.clips));
  const count = (f: (typeof FILTERS)[number]) => allClips.filter(f.test).length;
  const shown = $derived(FILTERS.find((f) => f.key === filter)!.test);

  const fileUrl = (c: Clip, file: string) => `/admin/voices/file/${c.key}/${file}`;
  const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  const settings = (d: NonNullable<Clip["direction"]>) =>
    `${d.model} · stability ${d.stability} · match ${d.similarity}${d.environment ? ` · ${d.environment}` : ""}`;

  // Keep what's typed in a note while the page reloads after a save.
  const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<svelte:head><title>Voice review · Beyfest admin</title></svelte:head>

<div class="page">
  <div class="head">
    <a class="back" href="/admin">← Admin</a>
    <h1>Voice review</h1>
  </div>
  <p class="intro">
    Every announcer clip in the Tetrafatalis Announcer voice. Mark each one <b>OK</b> or <b>Redo</b>, and say
    what's wrong in the note ("sounds surprised", "too fast"). Lines marked Redo get candidates made for them;
    they show up under the line, beside its old versions, and <b>Use this one</b> makes a candidate live (the
    old clip is kept in the history). Saved in <code>tournament-app/voice-review/</code>.
  </p>

  <div class="filters" role="group" aria-label="Show">
    {#each FILTERS as f (f.key)}
      <button class="btn" class:primary={filter === f.key} type="button" onclick={() => (filter = f.key)}>
        {f.label} <span class="n">{count(f)}</span>
      </button>
    {/each}
  </div>

  {#if form && "error" in form && form.error}
    <div class="banner err">{form.error}</div>
  {/if}

  {#each data.sections as section (section.title)}
    {@const clips = section.clips.filter(shown)}
    {#if clips.length}
      <h2 class="kicker">{section.title}</h2>
      <ul class="clips">
        {#each clips as c (c.url)}
          <li class="clip" data-status={c.mark?.status ?? "none"}>
            <div class="top">
              <div class="says">
                <b>{c.says}</b>
                <small>{c.when}</small>
              </div>
              {#if c.mark?.status}
                <span class="badge {c.mark.status}">{c.mark.status === "ok" ? "OK" : "Redo"}</span>
              {/if}
            </div>

            {#if c.live}
              <audio controls preload="none" src={c.live}></audio>
            {:else}
              <p class="missing">Not made yet.</p>
            {/if}

            <form method="POST" action="?/mark" use:enhance={keep} class="mark">
              <input type="hidden" name="url" value={c.url} />
              <input class="note" type="text" name="note" value={c.mark?.note ?? ""} placeholder="What's wrong with it? (optional)" />
              <button class="btn" class:primary={c.mark?.status === "ok"} name="status" value="ok">OK</button>
              <button class="btn" class:danger={c.mark?.status === "redo"} name="status" value="redo">Redo</button>
              <button class="btn" name="status" value={c.mark?.status ?? ""} title="Save the note, keep the mark">Save note</button>
            </form>

            {#if c.direction}
              <details class="dir">
                <summary>How it's voiced</summary>
                <code>{c.direction.text}</code>
                <small>{settings(c.direction)}</small>
              </details>
            {/if}

            {#if c.log.candidates.length}
              <div class="versions">
                <h3>Candidates</h3>
                {#each c.log.candidates as v (v.file)}
                  <div class="version candidate">
                    {#if v.direction}<code>{v.direction.text}</code>{/if}
                    <audio controls preload="none" src={fileUrl(c, v.file)}></audio>
                    <form method="POST" action="?/pick" use:enhance>
                      <input type="hidden" name="url" value={c.url} />
                      <input type="hidden" name="file" value={v.file} />
                      <button class="btn primary">Use this one</button>
                    </form>
                  </div>
                {/each}
              </div>
            {/if}

            {#if c.log.history.length}
              <details class="versions">
                <summary>History ({c.log.history.length})</summary>
                {#each c.log.history as v (v.file + v.label)}
                  <div class="version">
                    <small>{v.label} · {when(v.at)}</small>
                    {#if v.direction}<code>{v.direction.text}</code>{/if}
                    <audio controls preload="none" src={fileUrl(c, v.file)}></audio>
                  </div>
                {/each}
              </details>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/each}

  {#if !allClips.some(shown)}
    <p class="empty">Nothing here.</p>
  {/if}
</div>

<style>
  .page {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 16px 60px;
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 18px;
    margin-bottom: 14px;
  }
  .head h1 {
    font-size: 2.4rem;
  }
  .back {
    font-weight: 700;
  }
  .intro {
    max-width: 760px;
    margin-bottom: 16px;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 18px;
  }
  .n {
    opacity: 0.7;
    margin-left: 4px;
  }
  .banner.err {
    padding: 10px 14px;
    border-radius: 8px;
    margin-bottom: 16px;
    background: var(--lb-soft);
    border: 1px solid var(--red);
  }
  h2 {
    margin: 26px 0 10px;
  }
  .clips {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 12px;
  }
  .clip {
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 4px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    display: grid;
    gap: 8px;
  }
  .clip[data-status="ok"] {
    border-left-color: var(--green);
  }
  .clip[data-status="redo"] {
    border-left-color: var(--red);
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }
  .says {
    display: grid;
    gap: 2px;
  }
  small {
    color: var(--on-field-soft);
  }
  .badge {
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .badge.ok {
    background: var(--wb-soft);
  }
  .badge.redo {
    background: var(--lb-soft);
  }
  audio {
    width: 100%;
  }
  .missing {
    color: var(--on-field-soft);
  }
  .mark {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .note {
    flex: 1 1 220px;
    min-width: 0;
  }
  code {
    font-size: 0.85rem;
    word-break: break-word;
  }
  .dir,
  .versions {
    display: grid;
    gap: 6px;
  }
  details > summary {
    cursor: pointer;
    color: var(--on-field-soft);
  }
  .versions h3 {
    font-size: 1rem;
    margin: 4px 0 0;
  }
  .version {
    display: grid;
    gap: 4px;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--surface2);
  }
  .version.candidate {
    border: 1px solid var(--gold);
  }
  .empty {
    color: var(--on-field-soft);
  }
</style>
