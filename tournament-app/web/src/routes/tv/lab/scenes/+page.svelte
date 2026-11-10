<script lang="ts">
  import { page } from "$app/state";
  import { qrPath } from "$lib/qr";
  import { SCREENS } from "$lib/terms";
  import TvHeader from "$lib/components/tv/TvHeader.svelte";
  import DeedsScene from "$lib/components/tv/DeedsScene.svelte";
  import GatheringScene from "$lib/components/tv/GatheringScene.svelte";

  // Lab page for the TV scenes that need a particular moment of the day to
  // show up: The Gathering (no tournament yet) and Deeds of Renown (rounds
  // scored by finish). Sample data, at 1920×1080 scaled to fit. Not linked
  // from anywhere.  ?scene=gathering|deeds   ?n=<how many names or deeds>
  const q = page.url.searchParams;
  let scene = $state(q.get("scene") === "deeds" ? "deeds" : "gathering");
  const n = Number(q.get("n") ?? 9);

  const NAMES = ["Sean", "Shane", "Conor", "Eamon", "Tadhg", "McHale", "Moss", "Cuffe", "Ronan", "Steve", "Vhar", "Mark", "Niamh", "Aoife", "Padraig"];
  const DEEDS = [
    { key: "knockout", title: "The Banisher", name: "Shane", detail: "7 Banishments" },
    { key: "dominant", title: "The Annihilator", name: "Tadhg", detail: "4 Annihilations" },
    { key: "wall", title: "The Unbroken", name: "Sean & McHale", detail: "1.3 points let in per match" },
    { key: "comeback", title: "Risen from Ruin", name: "Eamon", detail: "came back from 0–4 against Conor" },
  ];
  const url = "192.168.1.20:5173/live";
  const qr = qrPath(`http://${url}`);

  let w = $state(1920);
  let h = $state(1080);
  const scale = $derived(Math.min(w / 1920, h / 1080));
</script>

<svelte:window bind:innerWidth={w} bind:innerHeight={h} />
<svelte:head><title>TV scenes · lab</title></svelte:head>

<div class="page">
  <div class="screen" style:transform="translate(-50%, -50%) scale({scale})">
    {#if scene === "deeds"}
      <TvHeader title={SCREENS.awards} {qr} />
      <div class="stage"><DeedsScene deeds={DEEDS.slice(0, Math.min(n, 4))} settled={false} /></div>
    {:else}
      <div class="stage"><GatheringScene when="March 2027 · Venue TBC" names={NAMES.slice(0, n)} {qr} {url} /></div>
    {/if}
  </div>
  <div class="controls">
    <button class:on={scene === "gathering"} onclick={() => (scene = "gathering")}>The Gathering</button>
    <button class:on={scene === "deeds"} onclick={() => (scene = "deeds")}>Deeds of Renown</button>
  </div>
</div>

<style>
  .page {
    position: fixed;
    inset: 0;
    background: #000;
    overflow: hidden;
  }
  .screen {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 1920px;
    height: 1080px;
    display: flex;
    flex-direction: column;
    background: #08080b;
    overflow: hidden;
  }
  .stage {
    position: relative;
    flex: 1;
  }
  .controls {
    position: fixed;
    left: 12px;
    bottom: 12px;
    z-index: 10;
    display: flex;
    gap: 8px;
    opacity: 0.5;
  }
  .controls:hover {
    opacity: 1;
  }
  button {
    font: 14px var(--font-text);
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
</style>
