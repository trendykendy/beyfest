<script lang="ts">
  import starterList from "../../../../../static/starter-fighters/fighters.json";
  import { page } from "$app/state";
  import { qrPath } from "$lib/qr";
  import { faceCrop, toFace } from "$lib/fighters";
  import { SCREENS, TITLES } from "$lib/terms";
  import type { PBRoyale } from "$lib/royale";
  import TvHeader from "$lib/components/tv/TvHeader.svelte";
  import DeedsScene from "$lib/components/tv/DeedsScene.svelte";
  import GatheringScene from "$lib/components/tv/GatheringScene.svelte";
  import FlowHold from "$lib/components/tv/FlowHold.svelte";
  import RoyaleBoard from "$lib/components/tv/RoyaleBoard.svelte";

  // Lab page for the TV scenes that need a particular moment of the day to
  // show up: The Gathering (no tournament yet), Deeds of Renown (rounds
  // scored by finish), the three holds between stages, and the Grand Mêlée's
  // board. Sample data, at 1920×1080 scaled to fit. Not linked from anywhere.
  //   ?scene=gathering|deeds|respite|eve|lord|melee   ?n=<how many names or deeds>
  const SCENES = ["gathering", "deeds", "respite", "eve", "lord", "melee"] as const;
  type SceneKey = (typeof SCENES)[number];
  const q = page.url.searchParams;
  let scene = $state<SceneKey>(SCENES.includes(q.get("scene") as SceneKey) ? (q.get("scene") as SceneKey) : "gathering");
  const n = Number(q.get("n") ?? 9);

  type Starter = { name: string; player: string; image: string; face?: unknown };
  const STARTERS = starterList as Starter[];
  const byPlayer = (p: string) => STARTERS.find((s) => s.player === p);
  const portrait = (p: string) => {
    const f = byPlayer(p);
    return f ? { src: `/starter-fighters/${f.image}`, style: faceCrop(toFace(f.face), 0.42, false) } : null;
  };

  const NAMES = ["Sean", "Shane", "Conor", "Eamon", "Tadhg", "McHale", "Moss", "Cuffe", "Ronan", "Steve", "Vhar", "Mark", "Niamh", "Aoife", "Padraig"];
  const DEEDS = [
    { key: "knockout", title: "The Banisher", name: "Shane", detail: "7 Banishments" },
    { key: "dominant", title: "The Annihilator", name: "Tadhg", detail: "4 Annihilations" },
    { key: "wall", title: "The Unbroken", name: "Sean & McHale", detail: "1.3 points let in per match" },
    { key: "comeback", title: "Risen from Ruin", name: "Eamon", detail: "came back from 0–4 against Conor" },
  ];
  const CIRCLES = [
    { name: "Circle I", rows: [["Shane", "wb"], ["Tadhg", "wb"], ["Eamon", "mb"], ["Moss", "lb"]] },
    { name: "Circle II", rows: [["Sean", "wb"], ["McHale", "wb"], ["Conor", "mb"], ["Cuffe", "lb"]] },
  ].map((c) => ({
    name: c.name,
    rows: c.rows.map(([name, tier]) => ({ name, tier, path: { wb: "Gilded Path", mb: "Iron Path", lb: "Ashen Path" }[tier]! })),
  }));
  const WAGERERS = [
    { rank: 1, name: "Niamh", worth: 31750 },
    { rank: 2, name: "Sean", worth: 22400 },
    { rank: 3, name: "Aoife", worth: 17900 },
    { rank: 4, name: "Moss", worth: 12050 },
    { rank: 5, name: "Shane", worth: 9300 },
  ];
  const FINALISTS = [
    { name: "Tadhg", fighter: "The Cheatseeker", art: portrait("Tadhg"), record: "7–0" },
    { name: "Shane", fighter: "The Pugilist", art: portrait("Shane"), record: "6–2" },
  ];
  // Skirmish I fought, Skirmish II in battle, the Final Mêlée waiting.
  const ROYALE: PBRoyale = {
    id: "lab",
    spaces: 4,
    entrants: ["Sean", "Conor", "Eamon", "Cuffe", "Tadhg", "Shane", "McHale", "Moss"],
    battles: {
      H1: { winner: "Sean", runnerUp: "Conor", startedAt: "2027-03-01T15:00:00Z", resultAt: "2027-03-01T15:05:00Z" },
      H2: { startedAt: "2027-03-01T15:06:00Z" },
    },
  };
  const who = (name: string) => {
    const f = byPlayer(name);
    return { name: f?.name ?? name, kana: "", img: f ? `/starter-fighters/${f.image}` : "", face: toFace(f?.face) };
  };

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
    {#if scene === "gathering"}
      <div class="stage"><GatheringScene when="March 2027 · Venue TBC" names={NAMES.slice(0, n)} {qr} {url} /></div>
    {:else}
      <TvHeader title={scene === "deeds" ? SCREENS.awards : scene === "melee" ? TITLES.royale : ""} {qr} />
      <div class="stage" class:padded={scene === "melee"}>
        {#if scene === "deeds"}
          <DeedsScene deeds={DEEDS.slice(0, Math.min(n, 4))} settled={false} />
        {:else if scene === "respite"}
          <FlowHold kind="respite" circles={CIRCLES} wagerers={WAGERERS} wagersOpen />
        {:else if scene === "eve"}
          <FlowHold kind="eve" finalists={FINALISTS} />
        {:else if scene === "lord"}
          <FlowHold kind="lordOfGold" wagerers={WAGERERS} />
        {:else}
          <RoyaleBoard royale={ROYALE} fighter={who} />
        {/if}
      </div>
    {/if}
  </div>
  <div class="controls">
    {#each SCENES as s (s)}
      <button class:on={scene === s} onclick={() => (scene = s)}>{s}</button>
    {/each}
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
    background: radial-gradient(ellipse 80% 80% at 50% 55%, #23232b, #08080b 78%);
    overflow: hidden;
  }
  .stage {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  /* As the TV's stage: the board lays itself out in the padded box. */
  .stage.padded {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 26px 46px;
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
