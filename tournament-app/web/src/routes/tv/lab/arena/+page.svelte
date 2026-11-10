<script lang="ts">
  import starterList from "../../../../../static/starter-fighters/fighters.json";
  import { artFor, faceCrop, toFace } from "$lib/fighters";
  import TvHeader from "$lib/components/tv/TvHeader.svelte";
  import ArenaScene, {
    type ArenaCallout,
    type ArenaSide,
    type ArenaSpeech,
    type ArenaStatus,
  } from "$lib/components/tv/arena/ArenaScene.svelte";
  import { SCREENS } from "$lib/terms";
  import { page } from "$app/state";
  import { onMount } from "svelte";

  // Lab page for the Arena (Match centre) under the TV top bar, at 1920×1080
  // scaled to fit. Not linked from anywhere. Plays the locked style frame's
  // scripted match (fighter-art/style-frames/arena): Buzzsaw v Pugilist.
  //   ?at=<ms>   jump to that moment of the script and hold (for screenshots)
  //   ?sides=off|left|right|alt   who's North (alt swaps each round)
  //   ?long      the longest match, ?noimg silhouettes, ?fill=<n> face fill
  //   ?clean     hide the controls
  //   R / space replays, H hides the controls.
  const q = page.url.searchParams;

  type Starter = { name: string; image: string; imageMirrored?: string; mirror?: boolean; face?: unknown };
  const STARTERS = starterList as Starter[];
  const byImage = (img: string) => STARTERS.find((s) => s.image.startsWith(img))!;
  const LEFT = byImage("buzzsaw");
  const RIGHT = byImage("pugilist");

  // The TV's slabArt(), for the static starter pictures.
  let fill = $state(Number(q.get("fill") ?? 0.42));
  function art(f: Starter, side: "left" | "right") {
    const wantFlip = (side === "left") !== !!f.mirror;
    const a = artFor(
      { img: `/starter-fighters/${f.image}`, imgMirrored: f.imageMirrored ? `/starter-fighters/${f.imageMirrored}` : "" },
      wantFlip,
    );
    const face0 = toFace(f.face);
    const face = face0 && wantFlip && !a.flip ? { ...face0, x: 1 - face0.x } : face0;
    return { src: a.src, style: faceCrop(face, fill, a.flip) };
  }

  // The style frame's match: [side, finish, points]. ?long plays the longest
  // a first-to-5 can run instead (nine single points), for the tags piling up.
  type Play = ["left" | "right", string, number];
  const FRAME_MATCH: Play[] = [
    ["left", "Endurance", 1],
    ["right", "Banishment", 2],
    ["left", "Annihilation", 3],
    ["right", "Endurance", 1],
    ["left", "Banishment", 2],
  ];
  const LONG_MATCH: Play[] = Array.from({ length: 9 }, (_, k) => [k % 2 ? "right" : "left", "Endurance", 1]);
  const MATCH = q.has("long") ? LONG_MATCH : FRAME_MATCH;
  const TARGET = 5;
  const START = 1500;
  const STEP = 2600;
  const LINES = ["Let it rip!", "Is that all you've got?", "If it's stupid and it works, it's not stupid."];

  // ── Controls ─────────────────────────────────────────────────────────
  type Sides = "off" | "left" | "right" | "alt";
  let sides = $state<Sides>((q.get("sides") as Sides) ?? "alt"); // ?sides=off|left|right|alt
  let noImg = $state(q.has("noimg"));
  let forceDoor = $state(false);
  let zoomed = $state(false);
  let tickerOn = $state(true);
  let speechOn = $state(true);
  let showControls = $state(!q.has("clean"));
  let holding = $state(false);

  // ── The script's state ──────────────────────────────────────────────
  type Round = { i: number; who: "left" | "right"; label: string; pts: number };
  let rounds = $state<Round[]>([]);
  let callout = $state<ArenaCallout | null>(null);
  let speechL = $state<ArenaSpeech>({ id: 0, text: "", show: false });
  let speechR = $state<ArenaSpeech>({ id: 0, text: "", show: false });
  let seq = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];

  const scoreOf = (who: "left" | "right") => rounds.filter((r) => r.who === who).reduce((a, r) => a + r.pts, 0);
  const sl = $derived(scoreOf("left"));
  const sr = $derived(scoreOf("right"));
  const decided = $derived(sl >= TARGET || sr >= TARGET);
  const door = $derived(!decided && (forceDoor || sl >= TARGET - 1 || sr >= TARGET - 1));
  const status = $derived<ArenaStatus>(decided ? "won" : door ? "door" : "battle");

  // Who's North this round, by the sides control.
  const northOnLeft = $derived(sides === "left" || (sides === "alt" && rounds.length % 2 === 0));
  function sideFor(lr: "left" | "right"): ArenaSide["side"] {
    if (sides === "off" || decided) return "";
    return (lr === "left") === northOnLeft ? "North" : "South";
  }
  function sideData(lr: "left" | "right"): ArenaSide {
    const f = lr === "left" ? LEFT : RIGHT;
    const mine = lr === "left" ? sl : sr;
    const theirs = lr === "left" ? sr : sl;
    return {
      name: f.name,
      art: noImg ? null : art(f, lr),
      score: mine,
      side: sideFor(lr),
      pills: rounds.filter((r) => r.who === lr),
      won: decided && mine > theirs,
      lost: decided && theirs > mine,
    };
  }

  function score(k: number, animate: boolean) {
    const [who, label, pts] = MATCH[k];
    rounds = [...rounds, { i: k, who, label, pts }];
    if (!animate) return;
    callout = { id: ++seq, who, i: k, label, pts };
    if (!speechOn) return;
    const text = LINES[k % LINES.length];
    const id = ++seq;
    const set = (b: ArenaSpeech) => (who === "left" ? (speechL = b) : (speechR = b));
    timers.push(
      setTimeout(() => set({ id, text, show: true }), 1800),
      setTimeout(() => set({ id, text, show: false }), 1800 + 2200),
    );
  }

  function replay(at: number | null = null) {
    timers.forEach(clearTimeout);
    timers = [];
    for (const a of document.getAnimations()) a.play();
    holding = false;
    rounds = [];
    callout = null;
    speechL = { id: 0, text: "", show: false };
    speechR = { id: 0, text: "", show: false };
    MATCH.forEach((_, k) => {
      const t = START + k * STEP;
      if (at !== null && t <= at) score(k, false);
      else if (at === null) timers.push(setTimeout(() => score(k, true), t));
    });
    if (at !== null) setTimeout(hold, 1200); // after the fades have finished
  }
  // Freeze everything where it is.
  function hold() {
    timers.forEach(clearTimeout);
    timers = [];
    for (const a of document.getAnimations()) a.pause();
    holding = true;
  }

  onMount(() => {
    const at = q.get("at");
    replay(at === null ? null : Number(at));
    return () => timers.forEach(clearTimeout);
  });

  let w = $state(1920);
  let h = $state(1080);
  const scale = $derived(Math.min(w / 1920, h / 1080));

  function onkey(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    if (e.key === "h" || e.key === "H") showControls = !showControls;
    if (e.key === " " || e.key === "r" || e.key === "R") {
      e.preventDefault();
      replay();
    }
  }
</script>

<svelte:window onkeydown={onkey} bind:innerWidth={w} bind:innerHeight={h} />
<svelte:head><title>Arena · lab</title></svelte:head>

<div class="page">
  <div class="screen" style:transform="translate(-50%, -50%) scale({scale})">
    <TvHeader title={SCREENS.matchCentre} />
    <div class="stage">
      <ArenaScene
        left={sideData("left")}
        right={sideData("right")}
        target={TARGET}
        {status}
        context="Circle II · Match 3 of 6"
        arena={sides === "off" || decided ? null : { stadium: "motor", round: rounds.length + 1, spin: false, key: 1 }}
        {door}
        {zoomed}
        ticker={tickerOn
          ? { live: { a: "The Joyzerker", b: "The Modsmith", sa: 2, sb: 1 }, next: { a: "The Beyby", b: "The Breycist" } }
          : {}}
        {callout}
        speech={{ left: speechL, right: speechR }}
      />
    </div>
  </div>

  {#if showControls}
    <div class="controls">
      <button onclick={() => replay()}>Replay</button>
      <button class:on={holding} onclick={() => (holding ? replay() : hold())}>Hold</button>
      <span class="group">
        Sides
        {#each [["off", "Off"], ["left", "North left"], ["right", "North right"], ["alt", "Swap each round"]] as [k, label]}
          <button class:on={sides === k} onclick={() => (sides = k as Sides)}>{label}</button>
        {/each}
      </span>
      <label><input type="checkbox" bind:checked={noImg} /> No images</label>
      <label><input type="checkbox" bind:checked={forceDoor} /> Death's Door</label>
      <label><input type="checkbox" bind:checked={zoomed} /> Zoomed</label>
      <label><input type="checkbox" bind:checked={tickerOn} /> Ticker</label>
      <label><input type="checkbox" bind:checked={speechOn} /> Speech</label>
      <label>Face fill <input type="range" min="0.25" max="0.8" step="0.01" bind:value={fill} /> {fill}</label>
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
    background: #090b11;
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
