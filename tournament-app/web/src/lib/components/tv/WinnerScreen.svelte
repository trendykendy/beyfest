<script lang="ts">
  import { artFor } from "$lib/fighters";
  import { SCREENS } from "$lib/terms";
  import FighterSilhouette from "./FighterSilhouette.svelte";

  // VICTORIOUS: the screen after a match result, in the Carved look. The
  // winner's picture charges in over a turning gold burst on the side they
  // had in the VS intro; opposite it, VICTORIOUS lands letter by letter, then
  // their name in slate, who they overcame and the score. The "[name] is
  // VICTORIOUS!" call starts with the slam (WINNER_SLAM in sounds.ts). It
  // then holds until `leaving` is set (the next match starting), plays its
  // exit, and calls ondone.
  //
  // Same conventions as VsIntro: a fixed 1920×1080 canvas, scaled to fit;
  // CSS keyframes, every duration and delay multiplied by --k (`slow`).
  //
  // img: the cut-out's URL ("" for the silhouette); cut-outs face left, and
  // mirror flips one that faces the other way. (Never the victory pose: that's
  // the Champion scene's.)
  //
  // next: the fixture the TV would call next (view.ts upNext), shown along the
  // bottom while the screen holds; it follows the data live. null hides it.
  type Fighter = { name: string; kana?: string; img: string; imgMirrored?: string; mirror?: boolean };
  type Next = { p1: string; p2: string; title: string; tier?: string };
  let {
    winner,
    loser,
    score = null, // [winner's, loser's]; null shows no score
    side = "red", // the winner's side in the VS intro: "red" (left) or "blue" (right)
    title = "", // matchContext(), as in the intro
    walkover = false, // a no-show: "Walkover" instead of a score
    slow = 1, // timing multiplier: 2 = half speed (lab only)
    leaving = false, // set to play the exit; ondone fires when it's over
    next = null, // the next fixture, or null
    ondone,
  }: {
    winner: Fighter;
    loser: { name: string };
    score?: [number, number] | null;
    side?: "red" | "blue";
    title?: string;
    tier?: string; // not shown in this look; kept so callers needn't change
    walkover?: boolean;
    slow?: number;
    leaving?: boolean;
    next?: Next | null;
    ondone?: () => void;
  } = $props();

  // Timeline (ms at normal speed). Keep in step with the CSS delays below:
  //   0–430 the picture charges in from its side, the burst opens
  //   450   slam: flash and shake
  //   600   VICTORIOUS, letter by letter (600–1050)
  //   900   the name; 1150 "overcomes …"; 1400 the score
  //   then it holds until `leaving`; the exit takes EXIT ms.
  const EXIT = 600;
  const LETTERS = [...SCREENS.winner];

  let w = $state(1920);
  const scale = $derived(w / 1920);

  $effect(() => {
    if (!leaving) return;
    const t = setTimeout(() => ondone?.(), EXIT * slow);
    return () => clearTimeout(t);
  });
</script>

<div class="win" class:from-r={side === "blue"} class:leaving bind:clientWidth={w} style:--k={slow}>
  <div class="canvas" style:transform="scale({scale})">
    <div class="backdrop"></div>
    <div class="shake">
      <div class="burst-wrap"><div class="burst"></div></div>

      <!-- The winner, on the side they had in the intro, facing the words. -->
      <div class="pic">
        {#if winner.img}
          {@const art = artFor(winner, (side === "red") !== !!winner.mirror)}
          <img src={art.src} alt="" class:flip={art.flip} />
        {:else}
          <div class="sil"><FighterSilhouette flip={side === "red"} /></div>
        {/if}
      </div>

      <div class="words">
        <div class="word" aria-label={SCREENS.winner}>
          {#each LETTERS as c, i}
            <span class="tf-carved ch" data-t={c} style:--at="{600 + i * 45}ms">{c}</span>
          {/each}
        </div>
        <div class="name" class:long={winner.name.length > 13} class:longer={winner.name.length > 17}>
          <span class="tf-carved stone" data-t={winner.name}>{winner.name}</span>
        </div>
        <p class="def">{walkover ? "advances past" : "overcomes"} <b>{loser.name}</b></p>
        {#if walkover}
          <div class="score"><span class="tf-carved wo" data-t="Walkover">Walkover</span></div>
        {:else if score}
          <div class="score">
            <span class="tf-carved" data-t={score[0]}>{score[0]}</span>
            <span class="tf-carved lo" data-t="–">–</span>
            <span class="tf-carved lo" data-t={score[1]}>{score[1]}</span>
          </div>
        {/if}
      </div>
    </div>

    {#if title}<div class="title"><span>{title}</span></div>{/if}
    <!-- Summoned next. Keyed so a change (the organiser's "Score this" pick,
         a slot filling in) pops in. -->
    {#if next}
      <div class="next">
        {#key `${next.p1}|${next.p2}|${next.title}`}
          <div class="next-in">
            <span class="next-tag">{SCREENS.upNext}</span>
            <span>{next.p1} <em>v</em> {next.p2} · {next.title}</span>
          </div>
        {/key}
      </div>
    {/if}
    <div class="flash"></div>
  </div>
</div>

<style>
  .win {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  .canvas {
    --gold: #eab13a;
    --edge: #1c0c04;
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 1080px;
    transform-origin: 0 0;
    font-family: var(--tf-font-text);
    color: #f3e6c4;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 75% at 50% 55%, #23232b, #08080b 78%);
    animation: fade-in calc(160ms * var(--k)) linear both;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }
  .shake {
    position: absolute;
    inset: 0;
    animation: shake calc(380ms * var(--k)) linear calc(450ms * var(--k)) both;
  }
  @keyframes shake {
    0%,
    100% {
      transform: none;
    }
    15% {
      transform: translate(-16px, 9px);
    }
    35% {
      transform: translate(13px, -8px);
    }
    55% {
      transform: translate(-8px, 5px);
    }
    75% {
      transform: translate(5px, -3px);
    }
  }

  /* ── The gold burst behind the winner ── */
  .burst-wrap {
    position: absolute;
    left: -460px;
    top: -420px;
    width: 1920px;
    height: 1920px;
    mask: radial-gradient(circle, #000 0, transparent 62%);
    opacity: 0.55;
    mix-blend-mode: screen;
    animation: burst-in calc(500ms * var(--k)) cubic-bezier(0.2, 0.9, 0.3, 1) calc(250ms * var(--k)) both;
  }
  .from-r .burst-wrap {
    left: auto;
    right: -460px;
  }
  .burst {
    position: absolute;
    inset: 0;
    background: repeating-conic-gradient(rgba(255, 200, 90, 0.85) 0 4deg, transparent 4deg 12deg);
    animation: turn calc(60s * var(--k)) linear infinite;
  }
  @keyframes burst-in {
    from {
      opacity: 0;
      transform: scale(0.3);
    }
  }
  @keyframes turn {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── The picture ── */
  .pic {
    position: absolute;
    left: -150px;
    top: 150px;
    width: 1100px;
    height: 800px;
    filter: drop-shadow(14px 18px 0 rgba(0, 0, 0, 0.6));
    animation: charge calc(450ms * var(--k)) cubic-bezier(0.2, 0.9, 0.25, 1.05) both;
  }
  .from-r .pic {
    left: auto;
    right: -150px;
    animation-name: charge-r;
  }
  .pic img {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: 0 50%;
    animation: breathe calc(9s * var(--k)) ease-in-out calc(450ms * var(--k)) infinite alternate;
  }
  .from-r .pic img {
    object-position: 100% 50%;
  }
  .pic img.flip {
    transform: scaleX(-1);
    object-position: 100% 50%; /* mirrored: its own right edge is the screen's left */
  }
  .from-r .pic img.flip {
    object-position: 0 50%;
  }
  .sil {
    position: absolute;
    left: 22%;
    right: 22%;
    top: 12%;
    --lite: #e9b75a;
  }
  @keyframes charge {
    0% {
      transform: translateX(-1400px) skewX(-12deg);
    }
    75% {
      transform: translateX(26px) skewX(2deg);
    }
    100% {
      transform: none;
    }
  }
  @keyframes charge-r {
    0% {
      transform: translateX(1400px) skewX(12deg);
    }
    75% {
      transform: translateX(-26px) skewX(-2deg);
    }
    100% {
      transform: none;
    }
  }
  @keyframes breathe {
    to {
      scale: 1.04;
    }
  }

  /* ── The words ── */
  .words {
    position: absolute;
    right: 70px;
    top: 200px;
    width: 900px;
    text-align: right;
  }
  .from-r .words {
    right: auto;
    left: 70px;
    text-align: left;
  }
  .word {
    white-space: nowrap;
    line-height: 1;
  }
  .ch {
    font-size: 122px;
    --stroke: 16px;
    --drop: 10px;
    letter-spacing: 0.01em;
    animation: letter calc(260ms * var(--k)) cubic-bezier(0.2, 1.5, 0.4, 1) calc(var(--at) * var(--k)) both;
  }
  @keyframes letter {
    from {
      opacity: 0;
      transform: translateY(-50px) scale(1.7);
    }
  }
  .name {
    margin-top: 26px;
    font-size: 68px;
    --stroke: 10px;
    --drop: 6px;
    animation: rise calc(320ms * var(--k)) cubic-bezier(0.2, 0.9, 0.3, 1.1) calc(900ms * var(--k)) both;
  }
  .name.long {
    font-size: 56px;
  }
  .name.longer {
    font-size: 44px;
    --stroke: 8px;
  }
  .def {
    margin-top: 30px;
    font-size: 40px;
    color: #e9cf8e;
    animation: rise calc(320ms * var(--k)) ease-out calc(1150ms * var(--k)) both;
  }
  .def b {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    text-transform: uppercase;
    color: #f6ecd2;
    text-shadow: 0 3px 0 #000;
  }
  .score {
    display: inline-flex;
    gap: 18px;
    align-items: center;
    margin-top: 22px;
    animation: slam calc(300ms * var(--k)) cubic-bezier(0.2, 1.5, 0.4, 1) calc(1400ms * var(--k)) both;
  }
  .score .tf-carved {
    font-size: 130px;
    --stroke: 14px;
    --drop: 8px;
    line-height: 1.1;
  }
  .score .lo {
    opacity: 0.55;
  }
  .score .wo {
    font-size: 80px;
    --stroke: 11px;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
  }
  @keyframes slam {
    from {
      opacity: 0;
      transform: scale(2);
    }
  }

  /* ── The match's title, top centre: a stone plate ── */
  .title {
    position: absolute;
    left: 0;
    right: 0;
    top: 40px;
    text-align: center;
    animation: rise calc(300ms * var(--k)) ease-out calc(500ms * var(--k)) both;
  }
  .title span,
  .next-tag {
    display: inline-block;
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 27px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #ffe6ad;
    padding: 9px 28px 7px;
    background: linear-gradient(180deg, #4a4d58, #1d1f26);
    border: 4px solid var(--gold);
    border-radius: 6px;
    box-shadow:
      0 0 0 3px var(--edge),
      inset 0 2px 0 rgba(255, 255, 255, 0.25),
      0 6px 0 #000;
  }
  /* ── Summoned next, bottom corner on the words' side ── */
  .next {
    position: absolute;
    right: 60px;
    bottom: 50px;
    font-size: 34px;
    color: #d9c79b;
    animation: fade-in calc(400ms * var(--k)) linear calc(2600ms * var(--k)) both;
  }
  .from-r .next {
    right: auto;
    left: 60px;
  }
  .next-in {
    display: flex;
    align-items: center;
    gap: 22px;
    animation: rise calc(300ms * var(--k)) ease-out both;
  }
  .next-tag {
    background: linear-gradient(180deg, #ffe08a, #c98a1c);
    color: #2a1606;
    border-color: #fff1c4;
  }

  .flash {
    position: absolute;
    inset: 0;
    background: #fff3c9;
    opacity: 0;
    pointer-events: none;
    animation: flash calc(320ms * var(--k)) ease-out calc(450ms * var(--k)) both;
  }
  @keyframes flash {
    0% {
      opacity: 0.85;
    }
    100% {
      opacity: 0;
    }
  }

  /* ── Exit: everything fades and the picture pulls back to its side ── */
  .leaving .canvas {
    animation: fade-out calc(600ms * var(--k)) ease-in both;
  }
  .leaving .pic {
    animation: leave calc(600ms * var(--k)) ease-in both;
  }
  .leaving.from-r .pic {
    animation-name: leave-r;
  }
  @keyframes leave {
    to {
      transform: translateX(-600px);
    }
  }
  @keyframes leave-r {
    to {
      transform: translateX(600px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .burst,
    .pic img {
      animation: none;
    }
  }
</style>
