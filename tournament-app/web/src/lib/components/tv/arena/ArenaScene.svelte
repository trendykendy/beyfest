<script lang="ts" module>
  // One side of the Arena, already in screen order (the TV puts round one's
  // North player on the left for the whole match; see lib/arena.ts).
  export type ArenaSide = {
    name: string;
    art: { src: string; style: string } | null; // portrait art (faceCrop style), null = silhouette
    score: number | null; // null shows "–"
    side: "North" | "South" | ""; // this round's side; "" while the draw plays / not drawn
    pills: { i: number; label: string; pts: number }[]; // rounds this side won, oldest first; i = place in the log
    won: boolean;
    lost: boolean;
  };
  export type ArenaStatus = "summoned" | "battle" | "door" | "won" | "result" | "walkover";
  // A finish call-out: bursts at the scorer's portrait, holds, then flies onto
  // the tag for round `i` under their name. A new id plays it.
  export type ArenaCallout = { id: number; who: "left" | "right"; i: number; label: string; pts: number };
  export type ArenaTicker = { live?: { a: string; b: string; sa: number; sb: number }; next?: { a: string; b: string } };
  export type ArenaSpeech = { id: number; text: string; show: boolean };
</script>

<script lang="ts">
  import { tick, untrack } from "svelte";
  import { SCREENS } from "$lib/terms";
  import { HEARTBEAT_MS } from "$lib/sounds";
  import RuneRing from "../RuneRing.svelte";
  import FighterSilhouette from "../FighterSilhouette.svelte";
  import StadiumTag from "../StadiumTag.svelte";
  import PixelBubble from "../speech/PixelBubble.svelte";

  // The Arena (Match centre) in the Tetrafatalis look (locked style frame:
  // fighter-art/style-frames/arena, "R2, gem in the frame"). Purely
  // presentational: the TV page works out every value and all the timing.
  //
  // Laid out on a fixed 1920×972 canvas (the screen under the 108px top bar),
  // scaled to the width it's given, so every position is the style frame's
  // (cqw × 19.2, y minus the bar).
  let {
    left,
    right,
    target,
    status,
    context,
    arena = null,
    onspindone,
    door = false,
    zoomed = false,
    ticker = {},
    callout = null,
    speech = { left: { id: 0, text: "", show: false }, right: { id: 0, text: "", show: false } },
  }: {
    left: ArenaSide;
    right: ArenaSide;
    target: number; // first to
    status: ArenaStatus;
    context: string; // where the match sits, e.g. "Circle II, match 3 of 6"
    // This round's arena (null while its draw plays). key remounts the tag for a new draw.
    arena?: { stadium: string; round: number; spin: boolean; key: string | number } | null;
    onspindone?: () => void;
    door?: boolean; // Death's Door: crimson glow and pill
    zoomed?: boolean; // match point after the slam: the portraits push in
    ticker?: ArenaTicker;
    callout?: ArenaCallout | null;
    speech?: { left: ArenaSpeech; right: ArenaSpeech };
  } = $props();

  const PILL: Record<ArenaStatus, string> = {
    summoned: SCREENS.upNext,
    battle: SCREENS.live,
    door: SCREENS.matchPoint,
    won: "Match won",
    result: "Result",
    walkover: "Walkover",
  };

  let w = $state(1920);
  const scale = $derived(w / 1920);

  const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Scores bump when they change ────────────────────────────────────
  let scoreL = $state<HTMLElement>();
  let scoreR = $state<HTMLElement>();
  function bumper(el: () => HTMLElement | undefined, value: () => number | null) {
    let last: number | null | undefined;
    $effect(() => {
      const v = value();
      untrack(() => {
        if (last !== undefined && v !== last && v !== null && !reduced()) {
          el()?.animate(
            [
              { transform: "scale(1.6)", filter: "brightness(1.8) drop-shadow(0 7px 0 #2b1806)" },
              { transform: "none", filter: "drop-shadow(0 7px 0 #2b1806)" },
            ],
            { duration: 500, easing: "cubic-bezier(.2, 1.6, .4, 1)" },
          );
        }
        last = v;
      });
    });
  }
  bumper(() => scoreL, () => left.score);
  bumper(() => scoreR, () => right.score);

  // ── The finish call-out ─────────────────────────────────────────────
  // Keep in step with the TV's CALLOUT_MS (the speech bubbles wait on it).
  const CALLOUT_MS = 1500;
  let fx = $state<ArenaCallout | null>(null); // the call-out in flight
  let fxEl = $state<HTMLElement>();
  const tagEls: HTMLElement[] = $state([]); // finish tags by round index
  let fxAnim: Animation | null = null;
  let playedId = 0;

  $effect(() => {
    const c = callout;
    if (!c || c.id === playedId) return;
    playedId = c.id;
    untrack(() => void fly(c));
  });

  async function fly(c: ArenaCallout) {
    fxAnim?.cancel();
    fx = c;
    await tick();
    const big = fxEl;
    const tag = tagEls[c.i];
    if (!big || !tag) {
      fx = null;
      return;
    }
    // Centre to centre, in canvas px (the rects are on screen, scaled). The
    // new tag may still be in its scale(0) pop-in, which leaves its centre
    // alone but not its height, so the heights come from layout.
    const b = big.getBoundingClientRect();
    const t = tag.getBoundingClientRect();
    const dx = (t.left + t.width / 2 - (b.left + b.width / 2)) / scale;
    const dy = (t.top + t.height / 2 - (b.top + b.height / 2)) / scale;
    const sc = tag.offsetHeight / big.offsetHeight;
    const base = c.who === "left" ? "translateX(-50%)" : "translateX(50%)";
    const anim = big.animate(
      [
        // bursts out of the portrait
        { offset: 0, opacity: 0, transform: `${base} scale(0.6)`, easing: "cubic-bezier(.2, 1.4, .4, 1)" },
        { offset: 0.16, opacity: 1, transform: `${base} scale(1)`, easing: "linear" },
        // holds so the room can read it
        { offset: 0.58, opacity: 1, transform: `${base} scale(1)`, easing: "cubic-bezier(.65, 0, .25, 1)" },
        // flies onto the tag under the name
        { offset: 1, opacity: 1, transform: `${base} translate(${dx}px, ${dy}px) scale(${sc})` },
      ],
      { duration: CALLOUT_MS, fill: "forwards" },
    );
    fxAnim = anim;
    // Safety net: a hidden/throttled tab can pause animations indefinitely,
    // which would leave the tag hidden. Force the landing if it overruns.
    setTimeout(() => {
      if (fxAnim === anim && anim.playState !== "finished") anim.finish();
    }, 1900);
    anim.onfinish = () => {
      if (fxAnim !== anim) return;
      fx = null;
      fxAnim = null;
      tag.animate([{ transform: "scale(1.18)" }, { transform: "scale(1)" }], {
        duration: 220,
        easing: "cubic-bezier(.2, .9, .3, 1.3)",
      });
    };
  }
</script>

{#snippet portrait(s: ArenaSide, lr: "l" | "r", bubble: ArenaSpeech)}
  <div class="portrait {lr}" class:won-side={s.won} class:lost-side={s.lost}>
    <svg class="band" viewBox="0 0 200 200" aria-hidden="true">
      <RuneRing r={89} size={12} circles={[98, 80]} />
    </svg>
    <div class="circle {s.side.toLowerCase() || 'none'}">
      <div class="push">
        <div class="slow">
          {#if s.art}
            <img src={s.art.src} alt="" style={s.art.style} />
          {:else}
            <div class="sil"><FighterSilhouette flip={lr === "l"} /></div>
          {/if}
        </div>
      </div>
    </div>
    {#if s.side}
      {#key s.side}
        <div class="gem {s.side === 'North' ? 'ruby' : 'sapph'}"></div>
        <div class="engr {s.side === 'North' ? 'ruby' : 'sapph'}">{s.side}</div>
      {/key}
    {/if}
    {#if s.art}
      {#key bubble.id}
        <PixelBubble side={lr === "l" ? "left" : "right"} text={bubble.text} show={bubble.show} />
      {/key}
    {/if}
  </div>
{/snippet}

{#snippet who(s: ArenaSide, lr: "l" | "r")}
  <div class="who {lr}" class:won-side={s.won} class:lost-side={s.lost}>
    <div class="name" class:long={s.name.length > 16}>{s.name}</div>
    {#if s.won || s.pills.length}
      <!-- Smaller tags as they pile up, so two rows still clear the ticker. -->
      {@const count = s.pills.length + (s.won ? 1 : 0)}
      <div class="pills" class:compact={count > 3} class:tiny={count > 5}>
        {#if s.won}<span class="fin winner">Winner</span>{/if}
        {#each s.pills as p (p.i)}
          <span class="fin" class:waiting={fx?.i === p.i} bind:this={tagEls[p.i]}>{p.label}<b>+{p.pts}</b></span>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<div class="arena" class:door class:zoomed bind:clientWidth={w} style:--beat="{HEARTBEAT_MS}ms">
  <div class="canvas" style:transform="scale({scale})">
    <div class="rays"></div>
    <div class="dust"></div>

    <div class="mstat">
      <span class="pill {status}" class:battle={status === "battle" || status === "door"}>{PILL[status]}</span>
      {#if context}<span>{context}</span>{/if}
      {#if arena}
        {#key arena.key}
          <StadiumTag stadium={arena.stadium} round={arena.round} spin={arena.spin} ondone={onspindone} />
        {/key}
      {/if}
    </div>

    {@render portrait(left, "l", speech.left)}
    {@render portrait(right, "r", speech.right)}

    <div class="center">
      <span class="score gold-text" bind:this={scoreL}>{left.score ?? "–"}</span>
      <div class="orn"></div>
      <span class="score gold-text" bind:this={scoreR}>{right.score ?? "–"}</span>
      <div class="ft">First to<b>{target}</b></div>
    </div>

    {@render who(left, "l")}
    {@render who(right, "r")}

    {#if fx}
      <div class="callout {fx.who === 'left' ? 'l' : 'r'}" bind:this={fxEl} aria-hidden="true">
        {fx.label}<em>+{fx.pts}</em>
      </div>
    {/if}

    {#if ticker.live || ticker.next}
      <div class="ticker">
        {#if ticker.live}
          <span class="lab">Also in battle</span>
          <span>{ticker.live.a} <b>{ticker.live.sa}–{ticker.live.sb}</b> {ticker.live.b}</span>
        {/if}
        {#if ticker.next}
          <span class="lab">{SCREENS.upNext}</span>
          <span>{ticker.next.a} <em>v</em> {ticker.next.b}</span>
        {/if}
      </div>
    {/if}

    <div class="door-glow"></div>
  </div>
</div>

<style>
  .arena {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(ellipse 80% 80% at 50% 50%, #1b2032, #090b11 78%);
  }
  .canvas {
    --gold: #e5b452;
    --gold-hi: #fff1c4;
    --ink: #ffe6ad;
    --ruby-glow: rgba(225, 30, 40, 0.85);
    --sapph-glow: rgba(40, 90, 235, 0.85);
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 972px;
    transform-origin: 0 0;
    isolation: isolate;
    font-family: var(--tf-font-text);
    color: #f3e6c4;
  }

  /* ── Backdrop ───────────────────────────────────────────────────── */
  .rays {
    position: absolute;
    inset: -20%;
    z-index: 0;
    opacity: 0.12;
    mix-blend-mode: screen;
    background: repeating-conic-gradient(
      from 180deg at 50% -10%,
      rgba(255, 214, 140, 0.9) 0deg 3deg,
      rgba(255, 214, 140, 0) 6deg 14deg
    );
    mask: linear-gradient(180deg, #000 10%, transparent 80%);
  }
  .dust {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.5;
    mix-blend-mode: screen;
    background-image:
      radial-gradient(circle, rgba(255, 220, 160, 0.9) 0 2.3px, transparent 3.8px),
      radial-gradient(circle, rgba(255, 220, 160, 0.6) 0 1.5px, transparent 2.7px);
    background-size:
      173px 211px,
      115px 134px;
    animation: dust 18s linear infinite;
  }
  @keyframes dust {
    from {
      background-position:
        0 0,
        58px 77px;
    }
    to {
      background-position:
        77px -845px,
        19px -461px;
    }
  }
  .gold-text {
    color: transparent;
    background: linear-gradient(180deg, #fff6d0 8%, #f1c25a 45%, #a8691e 78%, #f3cf74);
    -webkit-background-clip: text;
    background-clip: text;
  }

  /* ── Status line ────────────────────────────────────────────────── */
  .mstat {
    position: absolute;
    left: 0;
    right: 0;
    top: 23px;
    z-index: 6;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 27px;
    font-size: 29px;
    letter-spacing: 0.1em;
    font-variant: small-caps;
    color: #e9cf8e;
  }
  .pill {
    font-family: var(--tf-font-display);
    font-variant: normal;
    letter-spacing: 0.1em;
    padding: 7px 25px 5px;
    border: 3.5px solid var(--gold);
    border-radius: 58px;
    color: var(--ink);
    background: rgba(10, 8, 6, 0.7);
    transition:
      border-color 0.4s,
      box-shadow 0.4s,
      color 0.4s;
  }
  .pill.battle {
    box-shadow: 0 0 19px rgba(255, 157, 46, 0.55);
  }
  .pill.battle::before {
    content: "";
    display: inline-block;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: #ffb347;
    margin-right: 13px;
    box-shadow: 0 0 15px #ff9d2e;
    animation: blink 1.2s ease-in-out infinite;
    transform: translateY(-2px);
  }
  /* Death's Door: the only crimson on the screen, with the glow below. */
  .pill.door {
    border-color: #ff4a4a;
    color: #ffd0c8;
    box-shadow: 0 0 27px rgba(225, 30, 40, 0.75);
  }
  .pill.door::before {
    background: #ff3a3a;
    box-shadow: 0 0 15px #ff2020;
  }
  .pill.won {
    background: linear-gradient(180deg, #f6d27a, #b8801f);
    color: #2a1606;
    border-color: #fff1c4;
  }
  @keyframes blink {
    50% {
      opacity: 0.35;
    }
  }

  /* ── Portraits ──────────────────────────────────────────────────── */
  .portrait {
    position: absolute;
    top: 132px;
    width: 518px;
    height: 518px;
    z-index: 2;
    transition: filter 0.6s;
    /* Speech bubbles hang from the top of the portrait, over its middle. */
    --pb-anchor: 259px;
    --pb-gap: -40px;
  }
  .portrait.l {
    left: 154px;
  }
  .portrait.r {
    right: 154px;
  }
  .band {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    color: #e9b75a;
    opacity: 0.8;
    animation: spin 40s linear infinite;
    filter: drop-shadow(0 0 10px rgba(255, 157, 46, 0.6));
  }
  .portrait.r .band {
    animation-direction: reverse;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .circle {
    position: absolute;
    inset: 10%;
    border-radius: 50%;
    overflow: hidden;
    box-shadow:
      0 0 0 8px #e5b452,
      0 0 0 13px #5a3a12,
      0 0 58px rgba(255, 150, 40, 0.35);
    background: radial-gradient(circle at 50% 35%, #2a3048, #1d2235 40%, #0b0d15 78%);
    transition: background 0.5s;
  }
  .circle.north {
    background: radial-gradient(circle at 50% 35%, #a02232, #2a0a10 75%);
  }
  .circle.south {
    background: radial-gradient(circle at 50% 35%, #2a55b8, #0a1430 75%);
  }
  /* Two wrappers so the match point push-in and the slow breathing zoom each
     scale about the circle's centre, leaving faceCrop's transform alone. */
  .push,
  .slow {
    position: absolute;
    inset: 0;
  }
  .push {
    transition: transform 0.6s cubic-bezier(0.3, 0.8, 0.3, 1);
  }
  .zoomed .push {
    transform: scale(1.6);
  }
  .slow {
    animation: slowzoom 14s ease-in-out infinite alternate;
  }
  @keyframes slowzoom {
    from {
      scale: 1.06;
    }
    to {
      scale: 1;
    }
  }
  /* Without a face point: full height, centred. faceCrop's inline style wins. */
  .circle img {
    position: absolute;
    left: 50%;
    top: -10%;
    height: 180%;
    transform: translateX(-50%);
  }
  .sil {
    position: absolute;
    left: 6%;
    right: 6%;
    top: 22%;
    --lite: #e9b75a;
  }
  .gem {
    position: absolute;
    left: 50%;
    top: -23px;
    width: 65px;
    height: 65px;
    margin-left: -32.5px;
    transform: rotate(45deg);
    z-index: 3;
    animation: gem-in 0.45s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  .gem.ruby {
    background: linear-gradient(135deg, #ff9a9a, #c1121f 50%, #5c0610);
    box-shadow:
      0 0 0 6px #e5b452,
      0 0 0 10px #5a3a12,
      0 0 38px var(--ruby-glow);
  }
  .gem.sapph {
    background: linear-gradient(135deg, #9ac0ff, #1f4fc1 50%, #0a1d5c);
    box-shadow:
      0 0 0 6px #e5b452,
      0 0 0 10px #5a3a12,
      0 0 38px var(--sapph-glow);
  }
  @keyframes gem-in {
    from {
      transform: rotate(45deg) scale(0);
    }
  }
  .engr {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -46px;
    text-align: center;
    font-size: 29px;
    letter-spacing: 0.4em;
    font-variant: small-caps;
    animation: engr-in 0.5s ease-out both;
  }
  .engr.ruby {
    color: #e88a8a;
    text-shadow: 0 0 15px var(--ruby-glow);
  }
  .engr.sapph {
    color: #8aa6e8;
    text-shadow: 0 0 15px var(--sapph-glow);
  }
  @keyframes engr-in {
    from {
      opacity: 0;
    }
  }
  .won-side {
    filter: drop-shadow(0 0 38px rgba(255, 200, 90, 0.8));
  }
  .lost-side {
    filter: grayscale(0.6) brightness(0.55);
  }

  /* ── Centre: scores split by the ornament ───────────────────────── */
  .center {
    position: absolute;
    left: 50%;
    top: 199px;
    transform: translateX(-50%);
    z-index: 4;
    display: grid;
    grid-template-columns: 211px 58px 211px;
    align-items: center;
    justify-items: center;
  }
  .score {
    font-family: var(--tf-font-display);
    font-size: 230px;
    line-height: 1;
    filter: drop-shadow(0 7px 0 #2b1806);
    display: inline-block;
  }
  .orn {
    width: 4px;
    height: 250px;
    background: linear-gradient(180deg, transparent, var(--gold) 20%, var(--gold) 80%, transparent);
    position: relative;
  }
  .orn::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 27px;
    height: 27px;
    margin: -13.5px 0 0 -13.5px;
    transform: rotate(45deg);
    background: var(--gold);
    box-shadow: 0 0 19px rgba(255, 173, 61, 0.8);
  }
  .ft {
    grid-column: 1 / -1;
    margin-top: 23px;
    font-size: 31px;
    letter-spacing: 0.14em;
    font-variant: small-caps;
    color: #e9cf8e;
    text-align: center;
  }
  .ft b {
    display: block;
    font-family: var(--tf-font-display);
    font-weight: 400;
    font-size: 50px;
    color: var(--gold-hi);
    letter-spacing: 0;
  }

  /* ── Names and finish tags ──────────────────────────────────────── */
  .who {
    position: absolute;
    top: 710px;
    width: 653px;
    z-index: 3;
    text-align: center;
    transition: filter 0.6s;
  }
  .who.l {
    left: 86px;
  }
  .who.r {
    right: 86px;
  }
  .name {
    font-family: var(--tf-font-display);
    font-size: 61px;
    line-height: 1.15;
    color: var(--ink);
    text-shadow:
      0 5px 0 #1b0e04,
      0 0 27px rgba(0, 0, 0, 0.9);
    white-space: nowrap;
  }
  .name.long {
    font-size: 48px;
  }
  .name::before,
  .name::after {
    content: "❖";
    font-size: 0.55em;
    color: var(--gold);
    margin: 0 23px;
    vertical-align: 0.25em;
  }
  .pills {
    display: flex;
    gap: 13px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 17px;
  }
  .fin {
    font-family: var(--tf-font-display);
    font-size: 28px;
    letter-spacing: 0.05em;
    padding: 9px 19px 7px;
    color: var(--ink);
    background: linear-gradient(180deg, #23262d, #121418);
    border: 3px solid var(--gold);
    clip-path: polygon(15px 0, calc(100% - 15px) 0, 100% 50%, calc(100% - 15px) 100%, 15px 100%, 0 50%);
    animation: pop 0.4s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  .pills.compact {
    gap: 7px 9px;
    margin-top: 8px;
  }
  .compact .fin {
    font-size: 22px;
    padding: 7px 15px 5px;
  }
  .pills.tiny {
    gap: 6px;
  }
  .tiny .fin {
    font-size: 18px;
    padding: 6px 13px 4px;
  }
  .fin b {
    font-weight: 400;
    color: #ffcf73;
    margin-left: 10px;
  }
  .fin.winner {
    background: linear-gradient(180deg, #f6d27a, #b8801f);
    color: #2a1606;
  }
  /* Hidden while the call-out flies onto it. */
  .fin.waiting {
    opacity: 0;
  }
  @keyframes pop {
    from {
      transform: scale(0);
    }
  }

  /* ── The finish call-out ────────────────────────────────────────── */
  .callout {
    position: absolute;
    top: 487px;
    z-index: 8;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    text-align: center;
    font-family: var(--tf-font-display);
    font-size: 65px;
    letter-spacing: 0.05em;
    color: var(--ink);
    background: rgba(6, 7, 12, 0.85);
    padding: 12px 31px 8px;
    border-top: 3.5px solid var(--gold);
    border-bottom: 3.5px solid var(--gold);
    filter: drop-shadow(0 6px 0 #2b1806) drop-shadow(0 0 31px rgba(255, 160, 60, 0.7));
  }
  .callout.l {
    left: 422px;
    transform: translateX(-50%);
  }
  .callout.r {
    right: 422px;
    transform: translateX(50%);
  }
  .callout em {
    font-style: normal;
    font-size: 0.7em;
    margin-left: 19px;
    color: #fff;
  }

  /* ── Ticker ─────────────────────────────────────────────────────── */
  .ticker {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 81px;
    z-index: 6;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 48px;
    font-size: 31px;
    color: #d9c79b;
    background: linear-gradient(0deg, rgba(5, 6, 10, 0.96), rgba(5, 6, 10, 0.8));
    border-top: 4px solid var(--gold);
  }
  .ticker .lab {
    font-family: var(--tf-font-display);
    letter-spacing: 0.12em;
    color: var(--gold);
    font-size: 27px;
  }
  .ticker b {
    font-family: var(--tf-font-display);
    font-weight: 400;
    color: var(--ink);
    margin: 0 10px;
  }

  /* ── Death's Door ───────────────────────────────────────────────── */
  /* A crimson inset glow pulsing with the heartbeat. */
  .door-glow {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.6s;
    box-shadow: inset 0 0 115px 19px rgba(200, 20, 30, 0.55);
  }
  .door .door-glow {
    opacity: 1;
    animation: doorPulse var(--beat) ease-in-out infinite;
  }
  @keyframes doorPulse {
    50% {
      box-shadow: inset 0 0 154px 31px rgba(220, 20, 30, 0.7);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .band,
    .slow,
    .dust,
    .door .door-glow,
    .pill.battle::before {
      animation: none;
    }
    .push {
      transition: none;
    }
  }
</style>
