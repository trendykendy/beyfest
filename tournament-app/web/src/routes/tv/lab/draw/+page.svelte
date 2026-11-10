<script lang="ts">
  import { page } from "$app/state";
  import { STADIA } from "$lib/stadia";
  import { SCREENS } from "$lib/terms";
  import TvHeader from "$lib/components/tv/TvHeader.svelte";
  import StadiumDraw from "$lib/components/tv/StadiumDraw.svelte";

  // Lab page for the stadium draw (Casting the Runes) over the Arena's dark
  // stage, at 1920×1080 scaled to fit. Not linked from anywhere.
  //   ?look=reel|spotlight|spin   ?stadium=<key>   ?kind=next|launch
  //   ?clean hides the controls. R / space replays, H hides the controls.
  const q = page.url.searchParams;
  const LOOKS = ["reel", "spotlight", "spin"] as const;
  type Look = (typeof LOOKS)[number];

  let look = $state<Look>((q.get("look") as Look) ?? "reel");
  let stadium = $state(q.get("stadium") ?? STADIA[STADIA.length - 1].key);
  let kind = $state<"next" | "launch">(q.get("kind") === "launch" ? "launch" : "next");
  let showControls = $state(!q.has("clean"));
  let run = $state(1); // a new number plays it again
  let playing = $state(true);

  function replay() {
    playing = true;
    run++;
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
<svelte:head><title>Stadium draw · lab</title></svelte:head>

<div class="page">
  <div class="screen" style:transform="translate(-50%, -50%) scale({scale})">
    <TvHeader title={SCREENS.matchCentre} />
    <div class="stage">
      {#if playing}
        {#key `${run}|${look}|${stadium}|${kind}`}
          <StadiumDraw {stadium} {kind} round={2} {look} north="The Buzzsaw" south="The Pugilist" ondone={() => (playing = false)} />
        {/key}
      {/if}
    </div>
  </div>

  {#if showControls}
    <div class="controls">
      <button onclick={replay}>Replay</button>
      <span class="group">
        Look
        {#each LOOKS as l (l)}
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
    background: radial-gradient(ellipse 80% 80% at 50% 55%, #1b2032, #090b11 78%);
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
  .hint {
    opacity: 0.6;
    margin-left: auto;
  }
</style>
