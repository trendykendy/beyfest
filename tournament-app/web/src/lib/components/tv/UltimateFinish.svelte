<script module lang="ts">
  import type { MatchPointEvent } from "$lib/matchPoint";

  export type Variant = "a" | "b" | "c";

  // How long each moment takes, in ms at normal speed.
  const LENGTHS: Record<Variant, Record<MatchPointEvent, number>> = {
    a: { slam: 1200, suddenDeath: 1400, saved: 1800 },
    b: { slam: 2600, suddenDeath: 3000, saved: 2000 },
    c: { slam: 4600, suddenDeath: 5000, saved: 2800 },
  };
  // When the title lands, in ms: the impact sound goes with this.
  const LANDINGS: Record<Variant, Record<MatchPointEvent, number>> = {
    a: { slam: 120, suddenDeath: 120, saved: 120 },
    b: { slam: 350, suddenDeath: 350, saved: 300 },
    c: { slam: 1700, suddenDeath: 1900, saved: 600 },
  };
  export const eventLength = (v: Variant, e: MatchPointEvent) => LENGTHS[v][e];
  export const eventLanding = (v: Variant, e: MatchPointEvent) => LANDINGS[v][e];
</script>

<script lang="ts">
  import { faceCrop, type Face } from "$lib/fighters";
  import type { MatchPointState } from "$lib/matchPoint";
  import FighterSilhouette from "./FighterSilhouette.svelte";

  // Ultimate Finish: the overlay for match point. It sits over the Match
  // centre and has two layers:
  //   tension  the banner, for as long as someone is on match point; stays
  //            on through the stadium draw. (The darkening and pulsing colour
  //            are TensionGlow, which goes behind the Match centre.)
  //   moment   what plays once when something happens (`event`). Variant A
  //            pops the banner in place, B slams full-screen, and C pushes
  //            the fighters' art in face to face before the title lands.
  // Fixed 1920×1080 canvas, scaled to fit; CSS keyframes, durations and delays
  // multiplied by --k (`slow`), like the other TV scenes.
  // img: the cut-out ("" for the silhouette). Cut-outs face left; mirror marks
  // one that faces the other way. face: where the face is, for variant C.
  type Fighter = { name: string; img: string; mirror?: boolean; face?: Face | null };
  let {
    variant = "b",
    mp = "none", // from matchPointState()
    event = null, // the moment to play
    eventId = 0, // bump to play it again
    announced = true, // false: dims, but no banner until the moment has played
    banner = true, // false: no held banner at all (the Arena marks match point itself)
    p1,
    p2,
    score,
    slow = 1,
    ondone,
  }: {
    variant?: Variant;
    mp?: MatchPointState;
    event?: MatchPointEvent | null;
    eventId?: number;
    announced?: boolean;
    banner?: boolean;
    p1: Fighter;
    p2: Fighter;
    score: [number, number];
    slow?: number;
    ondone?: () => void;
  } = $props();

  const FACE_FILL = 0.85; // the face's share of the clear strip's height

  let w = $state(1920);
  const scale = $derived(w / 1920);

  // Whether the moment is playing. Cleared on a timer, as nothing else ends it.
  let playing = $state(false);
  $effect(() => {
    eventId;
    if (!event) {
      playing = false;
      return;
    }
    playing = true;
    const t = setTimeout(
      () => {
        playing = false;
        ondone?.();
      },
      eventLength(variant, event) * slow,
    );
    return () => clearTimeout(t);
  });

  const tension = $derived(mp === "p1" || mp === "p2" || mp === "both");
  const fullScreen = $derived(playing && event !== null && variant !== "a");

  // A save belongs to the blader behind: the one not on match point.
  const lead = $derived(
    event === "saved" ? (mp === "p1" ? "p2" : "p1") : mp === "p2" ? "p2" : mp === "p1" ? "p1" : "both",
  );
  const side = $derived(lead === "p1" ? "red" : lead === "p2" ? "blue" : "both");
  const leadName = $derived(lead === "p2" ? p2.name : lead === "p1" ? p1.name : "");

  const WORDS: Record<MatchPointEvent, { title: string; kana: string }> = {
    slam: { title: "Match point", kana: "マッチポイント" },
    suddenDeath: { title: "Sudden death", kana: "サドンデス" },
    saved: { title: "Saved!", kana: "セーブ" },
  };
  const words = $derived(event ? WORDS[event] : WORDS.slam);
  const tagline = $derived(
    event === "saved"
      ? `${leadName} survives`
      : event === "suddenDeath"
        ? "Next finish wins"
        : `${leadName}: one finish from the win`,
  );

  // The banner's text while tension holds; in variant A it also carries the
  // moment, so a save shows there for as long as the moment plays.
  const bannerMoment = $derived(variant === "a" && playing ? event : null);
  const bannerSide = $derived(bannerMoment === "saved" ? side : mp === "p1" ? "red" : mp === "p2" ? "blue" : "both");
  const bannerTitle = $derived(
    bannerMoment === "saved" ? "Match point saved!" : mp === "both" ? "Sudden death" : "Match point",
  );
  const bannerName = $derived(
    bannerMoment === "saved"
      ? leadName
      : mp === "both"
        ? "Next finish wins"
        : mp === "p1"
          ? p1.name
          : p2.name,
  );
</script>

<!-- The fighters look at each other: left panel facing right, right facing left.
     With a face point, the face sits in the clear strip above the band. -->
{#snippet portrait(f: Fighter, side: "left" | "right")}
  {@const flip = side === "left" ? !f.mirror : !!f.mirror}
  {#if !f.img}
    <div class="sil"><FighterSilhouette flip={side === "left"} /></div>
  {:else if f.face}
    <div class="face-box"><img src={f.img} alt="" style={faceCrop(f.face, FACE_FILL, flip)} /></div>
  {:else}
    <img src={f.img} alt="" class:flip />
  {/if}
{/snippet}

<div class="uf" bind:clientWidth={w} style:--k={slow}>
  <div class="canvas" style:transform="scale({scale})">
    {#if tension}
      <div class="tension who-{mp}">
        {#if banner && (announced || playing)}
          {#key bannerMoment ? eventId : "held"}
            <div class="banner side-{bannerSide}" class:pop={bannerMoment}>
              <span class="b-title">{bannerTitle}</span>
              <span class="b-name">{bannerName}</span>
            </div>
          {/key}
        {/if}
      </div>
    {/if}

    {#if fullScreen && event}
      {#key eventId}
        <div
          class="moment v-{variant} ev-{event} side-{side}"
          style:--len="{eventLength(variant, event)}ms"
          style:--land="{eventLanding(variant, event)}ms"
        >
          <div class="m-dark"></div>
          <div class="m-rays"></div>

          {#if variant === "c"}
            <div class="duo">
              {#if event !== "saved" || lead === "p1"}
                <div class="panel left" class:hero={lead !== "p2"} class:wide={event === "saved"}>
                  <div class="panel-art">{@render portrait(p1, "left")}</div>
                </div>
              {/if}
              {#if event !== "saved" || lead === "p2"}
                <div class="panel right" class:hero={lead !== "p1"} class:wide={event === "saved"}>
                  <div class="panel-art">{@render portrait(p2, "right")}</div>
                </div>
              {/if}
            </div>
          {/if}

          <div class="m-flash"></div>
          <div class="band">
            <span class="kana">{words.kana}</span>
            <span class="title">{words.title}</span>
          </div>
          <div class="sub">
            <span class="tag">{tagline}</span>
            <span class="tally">{score[0]}<i>–</i>{score[1]}</span>
          </div>
        </div>
      {/key}
    {/if}
  </div>
</div>

<style>
  .uf {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 1080px;
    transform-origin: 0 0;
  }
  /* Sides as in the VS intro: p1 red, p2 blue. */
  .side-red {
    --c1: #5a0309;
    --c2: #b5121b;
    --c3: var(--red);
    --c4: #ff7a3d;
  }
  .side-blue {
    --c1: #020a4a;
    --c2: #0b2fb8;
    --c3: #1f6bff;
    --c4: #3fd0ff;
  }
  .side-both {
    --c1: #b5121b;
    --c2: #5a0309;
    --c3: #020a4a;
    --c4: #0b2fb8;
  }

  /* ── Tension ── */
  .tension {
    position: absolute;
    inset: 0;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }

  .banner {
    position: absolute;
    left: 50%;
    bottom: 34px;
    display: flex;
    align-items: baseline;
    gap: 34px;
    padding: 12px 56px 14px;
    white-space: nowrap;
    color: var(--paper);
    background: linear-gradient(105deg, var(--c1), var(--c2) 45%, var(--c3));
    border: 4px solid var(--ink);
    border-top: 10px solid var(--gold);
    box-shadow: 10px 10px 0 var(--ink);
    transform: translateX(-50%) skewX(-10deg);
    font-family: var(--font-display);
    text-transform: uppercase;
    line-height: 1;
  }
  .b-title {
    font-size: 84px;
    color: var(--gold);
  }
  .b-name {
    font-size: 54px;
    font-weight: 700;
    font-stretch: 62%;
  }
  .banner.pop {
    animation: pop calc(380ms * var(--k)) cubic-bezier(0.2, 0.9, 0.25, 1.2) both;
  }
  @keyframes pop {
    from {
      transform: translateX(-50%) skewX(-10deg) scale(2.2);
      opacity: 0;
    }
  }

  /* ── The full-screen moment ── */
  .moment {
    position: absolute;
    inset: 0;
    animation:
      shake calc(420ms * var(--k)) linear calc(var(--land) * var(--k)) both,
      fade-away calc(280ms * var(--k)) linear calc((var(--len) - 280ms) * var(--k)) forwards;
  }
  .ev-suddenDeath {
    animation-name: shake-hard, fade-away;
  }
  @keyframes fade-away {
    to {
      opacity: 0;
    }
  }
  @keyframes shake {
    0%,
    100% {
      translate: 0 0;
    }
    15% {
      translate: -14px 9px;
    }
    35% {
      translate: 12px -8px;
    }
    55% {
      translate: -8px 5px;
    }
    75% {
      translate: 5px -3px;
    }
  }
  @keyframes shake-hard {
    0%,
    100% {
      translate: 0 0;
    }
    12% {
      translate: -26px 16px;
    }
    28% {
      translate: 24px -14px;
    }
    46% {
      translate: -18px 12px;
    }
    64% {
      translate: 12px -8px;
    }
    82% {
      translate: -6px 4px;
    }
  }
  .m-dark {
    position: absolute;
    inset: -40px;
    background: rgb(4 4 14 / 0.97);
    animation: fade-in calc(160ms * var(--k)) linear both;
  }
  .v-c .m-dark {
    background: #05050f;
  }
  .m-rays {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 2600px;
    height: 2600px;
    margin: -1300px 0 0 -1300px;
    background: repeating-conic-gradient(rgb(255 199 0 / 0.14) 0deg 7deg, transparent 7deg 18deg);
    animation:
      turn calc(24s * var(--k)) linear infinite,
      fade-in calc(260ms * var(--k)) linear calc(var(--land) * var(--k)) both;
  }
  @keyframes turn {
    to {
      rotate: 360deg;
    }
  }
  .m-flash {
    position: absolute;
    inset: -40px;
    background: #fff;
    opacity: 0;
    /* forwards, not both: the flash must stay off until the title lands. */
    animation: flash calc(320ms * var(--k)) ease-out calc(var(--land) * var(--k)) forwards;
  }
  @keyframes flash {
    0% {
      opacity: 0.95;
    }
    100% {
      opacity: 0;
    }
  }

  .band {
    position: absolute;
    left: -60px;
    right: -60px;
    top: 330px;
    height: 400px;
    display: grid;
    place-items: center;
    overflow: hidden;
    background: linear-gradient(105deg, var(--c1) 0%, var(--c2) 35%, var(--c3) 70%, var(--c4) 100%);
    border-top: 10px solid var(--gold);
    border-bottom: 10px solid var(--gold);
    box-shadow: 0 0 0 8px var(--ink);
    transform: rotate(-3deg);
    animation: band-in calc(var(--land) * 0.9 * var(--k)) cubic-bezier(0.2, 0.9, 0.25, 1.05) both;
  }
  .side-blue .band {
    animation-name: band-in-r;
  }
  .side-both .band {
    background: linear-gradient(90deg, #b5121b 0%, #5a0309 38%, #020a4a 62%, #0b2fb8 100%);
  }
  @keyframes band-in {
    from {
      transform: translateX(-2200px) rotate(-3deg) skewX(-14deg);
    }
  }
  @keyframes band-in-r {
    from {
      transform: translateX(2200px) rotate(-3deg) skewX(-14deg);
    }
  }
  /* In C the art has the screen first: the band arrives just before the title. */
  .v-c .band {
    animation-delay: calc((var(--land) - 240ms) * var(--k));
    animation-duration: calc(240ms * var(--k));
  }
  .kana {
    grid-area: 1 / 1;
    align-self: start;
    margin-top: 12px;
    font-family: var(--font-display);
    font-size: 58px;
    letter-spacing: 0.32em;
    color: rgb(255 255 255 / 0.72);
  }
  .title {
    grid-area: 1 / 1;
    margin-top: 40px;
    font-family: var(--font-display);
    font-size: 262px;
    line-height: 1;
    white-space: nowrap;
    text-transform: uppercase;
    color: var(--paper);
    text-shadow:
      8px 8px 0 var(--ink),
      -2px -2px 0 var(--ink);
    animation: title-in calc(300ms * var(--k)) cubic-bezier(0.2, 0.9, 0.25, 1.15) calc(var(--land) * var(--k)) both;
  }
  .ev-suddenDeath .title {
    font-size: 244px;
    color: var(--gold);
  }
  @keyframes title-in {
    from {
      transform: scale(2.4);
      opacity: 0;
    }
  }

  .sub {
    position: absolute;
    left: 0;
    right: 0;
    top: 776px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 48px;
    font-family: var(--font-display);
    text-transform: uppercase;
    line-height: 1;
    animation: rise calc(320ms * var(--k)) ease-out calc((var(--land) + 240ms) * var(--k)) both;
  }
  @keyframes rise {
    from {
      transform: translateY(40px);
      opacity: 0;
    }
  }
  .tag {
    padding: 12px 40px 16px;
    font-size: 66px;
    font-weight: 700;
    font-stretch: 62%;
    white-space: nowrap;
    background: var(--paper);
    color: var(--ink);
    border: 4px solid var(--ink);
    box-shadow: 10px 10px 0 var(--ink);
    transform: skewX(-10deg);
  }
  .tally {
    font-size: 124px;
    color: var(--gold);
    text-shadow: 6px 6px 0 var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .tally i {
    font-style: normal;
    margin: 0 10px;
  }

  /* ── Variant C: the fighters push in, face to face ── */
  .duo {
    position: absolute;
    inset: 0;
  }
  .panel {
    position: absolute;
    top: -40px;
    bottom: -40px;
    width: 1100px;
    overflow: hidden;
    border: solid var(--ink);
    border-width: 0 10px;
    transform: skewX(-8deg);
    filter: brightness(0.5) saturate(0.6);
    background: var(--field-deep);
  }
  .panel.hero {
    filter: none;
  }
  .panel.left {
    left: -130px;
    animation: from-left calc(620ms * var(--k)) cubic-bezier(0.2, 0.9, 0.25, 1.03) both;
  }
  .panel.right {
    right: -130px;
    animation: from-right calc(620ms * var(--k)) cubic-bezier(0.2, 0.9, 0.25, 1.03) both;
  }
  .panel.wide {
    width: 1500px;
  }
  @keyframes from-left {
    from {
      transform: translateX(-1300px) skewX(-8deg);
    }
  }
  @keyframes from-right {
    from {
      transform: translateX(1300px) skewX(-8deg);
    }
  }
  /* The slow push-in, then held under the title. */
  .panel-art {
    position: absolute;
    inset: 0 -110px;
    transform: skewX(8deg);
    /* From the faces, so the push-in doesn't lift them out of the clear strip. */
    transform-origin: 50% 18%;
    animation: push calc(var(--len) * var(--k)) cubic-bezier(0.2, 0.5, 0.4, 1) both;
  }
  /* The art can stop short of the screen's bottom: fade it out before it does. */
  .panel::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 58%, #05050f 74%);
  }
  @keyframes push {
    from {
      scale: 1;
    }
    to {
      scale: 1.22;
    }
  }
  .panel-art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 12%;
  }
  /* Fills the strip above the band; faceCrop() centres the face in it. */
  .face-box {
    position: absolute;
    left: 0;
    right: 0;
    top: 50px;
    height: 300px;
  }
  .panel-art img.flip {
    scale: -1 1;
  }
  .sil {
    position: absolute;
    inset: 12% 8%;
    --lite: #ffb199;
  }

  @media (prefers-reduced-motion: reduce) {
    .moment {
      animation: fade-away 280ms linear calc((var(--len) - 280ms) * var(--k)) forwards;
    }
    .m-rays,
    .m-flash,
    .band,
    .title,
    .sub,
    .panel,
    .panel-art,
    .banner.pop {
      animation: none;
    }
  }
</style>
