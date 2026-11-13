<script lang="ts">
  import { page } from "$app/state";
  import { STADIA } from "$lib/stadia";
  import { SCREENS } from "$lib/terms";
  import TvHeader from "$lib/components/tv/TvHeader.svelte";
  import StadiumDraw from "$lib/components/tv/StadiumDraw.svelte";
  import CastingRunes, { RUNES_LOOKS, type RunesLook } from "$lib/components/tv/casting/CastingRunes.svelte";

  // Lab page for Casting the Runes (the arena draw) over the Arena's dark
  // stage, at 1920×1080 scaled to fit. Not linked from anywhere.
  //   ?look=die|stones|wheel (3D) or reel|spotlight|spin (the 2D fallback)
  //   ?stadium=<key>   ?kind=next|launch   ?clean hides the controls
  //   R / space replays, H hides the controls.
  const q = page.url.searchParams;
  const OLD = ["reel", "spotlight", "spin"] as const;
  type Look = RunesLook | (typeof OLD)[number];

  let look = $state<Look>((q.get("look") as Look) ?? "die");
  let stadium = $state(q.get("stadium") ?? STADIA[1].key);
  let kind = $state<"next" | "launch">(q.get("kind") === "launch" ? "launch" : "next");
  let showControls = $state(!q.has("clean"));
  let run = $state(1); // a new number plays it again
  let playing = $state(true);
  let tookMs = $state(0); // how long the last draw ran, start to ondone
  let started = performance.now();

  function replay() {
    playing = true;
    run++;
    started = performance.now();
  }
  function done() {
    playing = false;
    tookMs = Math.round(performance.now() - started);
  }

  let w = $state(1920);
  let h = $state(1080);
  const scale = $derived(Math.min(w / 1920, h / 1080));

  function onkey(e: KeyboardEvent) {
    if (e.key === "h" || e.key === "H") showControls = !showControls;
    if (e.key === " " || e.key === "r" || e.key === "R") {
      e.preventDefault();
      replay();
    }
  }
</script>

<svelte:window onkeydown={onkey} bind:innerWidth={w} bind:innerHeight={h} />
<svelte:head><title>Casting the Runes · lab</title></svelte:head>

<div class="page">
  <div class="screen" style:transform="translate(-50%, -50%) scale({scale})">
    <TvHeader title={SCREENS.matchCentre} />
    <div class="stage">
      {#if playing}
        {#key `${run}|${look}|${stadium}|${kind}`}
          {#if (RUNES_LOOKS as string[]).includes(look)}
            <CastingRunes {stadium} {kind} round={2} look={look as RunesLook} north="The Buzzsaw" south="The Pugilist" ondone={done} />
          {:else}
            <StadiumDraw {stadium} {kind} round={2} look={look as (typeof OLD)[number]} north="The Buzzsaw" south="The Pugilist" ondone={done} />
          {/if}
        {/key}
      {/if}
    </div>
  </div>

  {#if showControls}
    <div class="controls">
      <button onclick={replay}>Replay</button>
      <span class="group">
        3D
        {#each RUNES_LOOKS as l (l)}
          <button class:on={look === l} onclick={() => ((look = l), replay())}>{l}</button>
        {/each}
      </span>
      <span class="group">
        2D fallback
        {#each OLD as l (l)}
          <button class:on={look === l} onclick={() => ((look = l), replay())}>{l}</button>
        {/each}
      </span>
      <span class="group">
        Arena
        {#each STADIA as s (s.key)}
          <button class:on={stadium === s.key} onclick={() => ((stadium = s.key), replay())}>{s.num}</button>
        {/each}
      </span>
      <span class="group">
        {#each ["next", "launch"] as const as k (k)}
          <button class:on={kind === k} onclick={() => ((kind = k), replay())}>{k}</button>
        {/each}
      </span>
      {#if tookMs}<span class="took">last ran {(tookMs / 1000).toFixed(1)}s</span>{/if}
      <span class="hint">R / space replays · H hides this</span>
    </div>
  {/if}
</div>

<style>
  .page {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
  }
  /* The TV at 1920×1080, scaled to fit the window. */
  .screen {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 1920px;
    height: 1080px;
    display: flex;
    flex-direction: column;
    background: radial-gradient(ellipse 80% 80% at 50% 55%, #23232b, #08080b 78%);
    overflow: hidden;
  }
  .stage {
    position: relative;
    flex: 1;
  }
  .controls {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    padding: 10px 14px;
    background: rgb(0 0 0 / 0.78);
    color: #fff;
    font: 14px var(--font-text);
    border: 1px solid rgb(255 255 255 / 0.2);
  }
  .group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  button {
    font: inherit;
    padding: 4px 10px;
    background: #222;
    color: #fff;
    border: 1px solid #555;
    cursor: pointer;
  }
  button.on {
    background: var(--gold);
    color: #000;
  }
  .took {
    color: #ffd257;
  }
  .hint {
    opacity: 0.6;
    margin-left: auto;
  }
</style>
