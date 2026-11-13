<script lang="ts">
  import { artFor } from "$lib/fighters";
  import FighterSilhouette from "./FighterSilhouette.svelte";
  import { FINISHES } from "$lib/finishes";
  import { ARENA_NAME, SCREENS, STAGES, TITLES } from "$lib/terms";
  import type { ChampionRun } from "$lib/view";

  // The champion's scene, in the Carved look: the winner's picture in a gold
  // frame over a turning gold burst, with a crack of light through the Ring
  // behind it (the way home opening); their title in carved gold and their
  // name in slate; how their tournament went, in stone tiles; and who fell to
  // them in the final. It plays its reveal each time the scene comes up
  // (frame slams in, flash, the words land), then idles with the burst
  // turning and gold motes falling. The Deeds run along the bottom.
  //
  // Used for the Hero of Gyrondor and, with a different `kicker` and no run,
  // for the Grand Mêlée's Last One Standing.
  //
  // victory: the fighter's victory pose, if they have one: shown in the frame
  // instead of the cut-out, and never flipped (it has writing on it).
  // On a 1920×972 canvas (the screen under the top bar), scaled to the width.
  type Fighter = { name: string; player: string; kana?: string; img: string; imgMirrored?: string; victory?: string; mirror?: boolean };
  // An award for the ticker, names already filled in.
  type TickerAward = { key: string; title: string; name: string; detail: string };
  let {
    champion,
    runnerUp = null,
    run = null,
    kicker = TITLES.champion,
    awards = [],
  }: {
    champion: Fighter; // name: combat name (or the player's own); player: as typed for the tournament
    runnerUp?: Fighter | null;
    run?: ChampionRun | null; // their tournament, for the stat tiles (none: no tiles, e.g. the Grand Mêlée)
    kicker?: string; // the title they've won
    awards?: TickerAward[]; // the Deeds along the bottom (none: no strip)
  } = $props();

  // The strip scrolls at a steady speed whatever the number of deeds: the
  // list is drawn twice and slides by one copy's width per loop.
  const tickerSeconds = $derived(Math.max(12, awards.length * 7));

  const finishLabel = (key: string) => FINISHES.find((f) => f.key === key)?.label ?? key;

  // Stat tiles. Rounds and the favourite finish only exist when matches were
  // scored round by round.
  const tiles = $derived.by(() => {
    if (!run) return [];
    const out: { value: string; label: string; word?: boolean }[] = [
      { value: `${run.wins}–${run.losses}`, label: "Won–lost" },
      { value: `${run.pointDiff > 0 ? "+" : ""}${run.pointDiff}`, label: "Point difference" },
    ];
    if (run.roundsWon) out.push({ value: String(run.roundsWon), label: "Rounds won" });
    if (run.topFinish) {
      out.push({ value: finishLabel(run.topFinish.key), label: `Favourite finish, ×${run.topFinish.count}`, word: true });
    }
    return out;
  });

  const finalScore = $derived(
    !run?.final ? "" : run.final.walkover ? "W/O" : `${run.final.score[0]}–${run.final.score[1]}`,
  );

  // Long names step down in size so they fit their column.
  const nameSize = (n: string) => (n.length <= 12 ? "" : n.length <= 16 ? "long" : "longer");
  const showPlayer = (f: Fighter) => !!f.player && f.player.trim().toLowerCase() !== f.name.trim().toLowerCase();

  // Gold motes, random once per reveal. The first fall of every piece starts
  // in the second after the slam, so it reads as a burst; then they loop.
  const COLOURS = ["#eab13a", "#ffd257", "#fff1c4", "#c98a1c"];
  // svelte-ignore state_referenced_locally
  const motes = Array.from({ length: 40 }, () => ({
    left: (Math.random() * 100).toFixed(1),
    w: Math.round(8 + Math.random() * 10),
    h: Math.round(5 + Math.random() * 7),
    colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    dur: Math.round(3600 + Math.random() * 3200),
    delay: Math.round(450 + Math.random() * 1200),
    dx: Math.round((Math.random() - 0.5) * 240),
    rot: Math.round((Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720)),
  }));

  let w = $state(1920);
  const scale = $derived(w / 1920);
</script>

<div class="champ" bind:clientWidth={w}>
  <div class="canvas" style:transform="scale({scale})">
    <div class="burst-wrap" aria-hidden="true"><div class="burst"></div></div>
    <div class="crack" aria-hidden="true"></div>

    <!-- The picture, in its gold frame. -->
    <div class="frame">
      {#if champion.victory}
        <img src={champion.victory} alt="" />
      {:else if champion.img}
        {@const art = artFor(champion, !champion.mirror)}
        <img class="cut" src={art.src} alt="" class:flip={art.flip} />
      {:else}
        <div class="sil"><FighterSilhouette flip /></div>
      {/if}
    </div>

    <div class="info">
      {#if run}<span class="plate gold">{ARENA_NAME.replace(/^the /, "The ")} is broken</span>{/if}
      <span class="tf-carved ttl" class:long={kicker.length > 16} data-t={kicker}>{kicker}</span>
      <span class="tf-carved stone nm {nameSize(champion.name)}" data-t={champion.name}>{champion.name}</span>
      {#if showPlayer(champion)}<p class="player">{champion.player}</p>{/if}

      {#if tiles.length}
        <div class="tiles">
          {#each tiles as t, i (t.label)}
            <div class="tile" class:word={t.word} style:--i={i}>
              <b>{t.value}</b>
              <span>{t.label}</span>
            </div>
          {/each}
        </div>
      {/if}

      {#if runnerUp}
        <div class="runner">
          <span class="plate">Fell at the last</span>
          <b>{runnerUp.name}</b>
          {#if showPlayer(runnerUp)}<span>{runnerUp.player}</span>{/if}
          {#if finalScore}<span class="sc"><small>{STAGES.grandFinal}</small>{finalScore}</span>{/if}
        </div>
      {/if}
    </div>

    <div class="motes" aria-hidden="true">
      {#each motes as c}
        <i
          style:left="{c.left}%"
          style:width="{c.w}px"
          style:height="{c.h}px"
          style:background={c.colour}
          style:--dur="{c.dur}ms"
          style:--delay="{c.delay}ms"
          style:--dx="{c.dx}px"
          style:--rot="{c.rot}deg"
        ></i>
      {/each}
    </div>

    {#if awards.length}
      <!-- The Deeds, scrolling along the bottom once the reveal has settled. -->
      <div class="ticker" style:--loop="{tickerSeconds}s">
        <span class="ticker-tag">{SCREENS.awards}</span>
        <div class="ticker-window">
          <div class="ticker-run">
            {#each [0, 1] as copy (copy)}
              <div class="ticker-list" aria-hidden={copy === 1 ? "true" : undefined}>
                {#each awards as a (a.key)}
                  <span class="tick"><b>{a.title}</b> {a.name} · {a.detail}</span>
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}
    <div class="flash" aria-hidden="true"></div>
  </div>
</div>

<style>
  .champ {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(ellipse 70% 70% at 30% 50%, #3a2d14, #08080b 75%);
  }
  .canvas {
    --gold: #eab13a;
    --edge: #1c0c04;
    --quiet: #b9ab8c;
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 972px;
    transform-origin: 0 0;
    font-family: var(--tf-font-text);
    color: #f3e6c4;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }

  /* ── Behind the picture: a turning gold burst, and the crack in the Ring ── */
  .burst-wrap {
    position: absolute;
    left: -500px;
    top: -480px;
    width: 1920px;
    height: 1920px;
    opacity: 0.5;
    mix-blend-mode: screen;
    mask: radial-gradient(circle, #000 0, transparent 62%);
    animation: fade-in 600ms linear 300ms both;
  }
  .burst {
    position: absolute;
    inset: 0;
    background: repeating-conic-gradient(rgba(255, 200, 90, 0.85) 0 4deg, transparent 4deg 12deg);
    animation: turn 70s linear infinite;
  }
  @keyframes turn {
    to {
      transform: rotate(360deg);
    }
  }
  .crack {
    position: absolute;
    inset: 0;
    background: linear-gradient(104deg, transparent 49.6%, #fff6d0 49.8%, #ffd257 50%, transparent 50.5%);
    mask: linear-gradient(180deg, #000, transparent 60%);
    filter: drop-shadow(0 0 18px rgba(255, 210, 110, 0.9));
    transform-origin: 50% 0;
    animation: crack 700ms cubic-bezier(0.2, 0.9, 0.3, 1) 700ms both;
  }
  @keyframes crack {
    from {
      opacity: 0;
      transform: scaleY(0);
    }
  }

  /* ── The picture ── */
  .frame {
    position: absolute;
    left: 70px;
    top: 50px;
    width: 780px;
    height: 780px;
    border-radius: 10px;
    overflow: hidden;
    background: radial-gradient(circle at 50% 35%, #3a3f55, #101218 78%);
    box-shadow:
      0 0 0 6px var(--gold),
      0 0 0 12px var(--edge),
      0 18px 0 #000,
      0 0 90px rgba(255, 170, 50, 0.5);
    animation: frame-in 480ms cubic-bezier(0.2, 0.9, 0.25, 1.1) both;
  }
  @keyframes frame-in {
    from {
      transform: translateX(-1100px) rotate(-8deg);
    }
  }
  .frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* A cut-out (no victory pose): the whole figure, not cropped to fill. */
  .frame img.cut {
    object-fit: contain;
  }
  .frame img.flip {
    transform: scaleX(-1);
  }
  .sil {
    position: absolute;
    inset: 12% 14%;
    --lite: #e9b75a;
  }

  /* ── The words ── */
  .info {
    position: absolute;
    left: 930px;
    right: 60px;
    top: 50px;
  }
  .plate {
    display: inline-block;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 24px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
    color: #ffe6ad;
    padding: 8px 22px 6px;
    background: linear-gradient(180deg, #4a4d58, #1d1f26);
    border: 4px solid var(--gold);
    border-radius: 6px;
    box-shadow:
      0 0 0 3px var(--edge),
      inset 0 2px 0 rgba(255, 255, 255, 0.25),
      0 6px 0 #000;
  }
  .plate.gold {
    background: linear-gradient(180deg, #ffe08a, #c98a1c);
    color: #2a1606;
    border-color: #fff1c4;
    animation: rise 320ms ease-out 500ms both;
  }
  .ttl {
    display: block;
    width: max-content;
    margin-top: 22px;
    font-size: 64px;
    line-height: 1.05;
    --stroke: 9px;
    --drop: 6px;
    animation: slam 320ms cubic-bezier(0.2, 1.5, 0.4, 1) 650ms both;
  }
  .ttl.long {
    font-size: 54px;
  }
  .nm {
    display: block;
    width: max-content;
    margin-top: 6px;
    font-size: 84px;
    --stroke: 11px;
    --drop: 7px;
    animation: slam 320ms cubic-bezier(0.2, 1.5, 0.4, 1) 850ms both;
  }
  .nm.long {
    font-size: 68px;
    --stroke: 10px;
  }
  .nm.longer {
    font-size: 54px;
    --stroke: 8px;
  }
  .player {
    margin-top: 4px;
    font-size: 40px;
    font-style: italic;
    color: #e9cf8e;
    animation: rise 320ms ease-out 1000ms both;
  }
  @keyframes slam {
    from {
      opacity: 0;
      transform: scale(1.8);
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(26px);
    }
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-top: 34px;
  }
  .tile {
    padding: 16px 8px 12px;
    text-align: center;
    background: linear-gradient(180deg, #3d4049, #1b1d23);
    border-radius: 6px;
    box-shadow:
      0 0 0 3px var(--gold),
      0 0 0 6px var(--edge),
      0 8px 0 #000;
    animation: pop 360ms cubic-bezier(0.2, 1.5, 0.4, 1) calc(1200ms + var(--i) * 110ms) both;
  }
  .tile b {
    display: block;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 56px;
    line-height: 1;
    color: #ffd257;
    text-shadow: 0 4px 0 var(--edge);
    white-space: nowrap;
  }
  /* A word, not a number (the favourite finish): smaller, to fit the tile. */
  .tile.word b {
    font-size: 25px;
    line-height: 56px;
    text-transform: uppercase;
  }
  .tile span {
    font-size: 22px;
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: var(--quiet);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.4);
    }
  }

  .runner {
    display: flex;
    align-items: center;
    gap: 22px;
    margin-top: 40px;
    font-size: 32px;
    color: #d9c79b;
    white-space: nowrap;
    animation: rise 360ms ease-out 1800ms both;
  }
  .runner b {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 28px;
    text-transform: uppercase;
    color: #f6ecd2;
  }
  .runner .plate {
    font-size: 19px;
    padding: 7px 14px 5px;
  }
  .runner > span:not(.plate):not(.sc) {
    font-size: 28px;
  }
  .runner .sc {
    margin-left: auto;
    display: flex;
    align-items: baseline;
    gap: 14px;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 50px;
    color: #ffd257;
    text-shadow: 0 4px 0 var(--edge);
  }
  .runner .sc small {
    font-family: var(--tf-font-text);
    font-weight: 400;
    font-size: 24px;
    font-variant: small-caps;
    letter-spacing: 0.08em;
    color: var(--quiet);
    text-shadow: none;
  }

  /* ── Gold motes ── */
  .motes {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .motes i {
    position: absolute;
    top: -30px;
    opacity: 0;
    animation: fall var(--dur) linear var(--delay) infinite;
  }
  @keyframes fall {
    0% {
      opacity: 1;
      transform: translate(0, 0) rotate(0);
    }
    100% {
      opacity: 0.9;
      transform: translate(var(--dx), 1040px) rotate(var(--rot));
    }
  }

  .flash {
    position: absolute;
    inset: 0;
    background: #fff3c9;
    opacity: 0;
    pointer-events: none;
    animation: flash 360ms ease-out 480ms both;
  }
  @keyframes flash {
    0% {
      opacity: 0.85;
    }
    100% {
      opacity: 0;
    }
  }

  /* ── The Deeds, along the bottom ── */
  .ticker {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 81px;
    display: flex;
    align-items: center;
    font-size: 31px;
    color: #d9c79b;
    background: linear-gradient(0deg, #08080b, #111116);
    border-top: 5px solid var(--gold);
    animation: fade-in 500ms linear 2400ms both;
  }
  .ticker-tag {
    flex: none;
    align-self: stretch;
    display: flex;
    align-items: center;
    padding: 0 34px;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 24px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #2a1606;
    background: linear-gradient(180deg, #ffe08a, #c98a1c);
  }
  .ticker-window {
    flex: 1;
    overflow: hidden;
    mask: linear-gradient(90deg, transparent 0, #000 40px, #000 calc(100% - 60px), transparent 100%);
  }
  .ticker-run {
    display: flex;
    width: max-content;
    animation: ticker var(--loop) linear infinite;
  }
  .ticker-list {
    display: flex;
    white-space: nowrap;
  }
  .tick {
    padding: 0 44px;
  }
  .tick b {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 26px;
    text-transform: uppercase;
    color: #ffd257;
    margin-right: 10px;
  }
  @keyframes ticker {
    to {
      transform: translateX(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .burst,
    .motes i,
    .ticker-run {
      animation: none;
    }
  }
</style>
