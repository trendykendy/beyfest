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
  import { tick, untrack, type Snippet } from "svelte";
  import { SCREENS } from "$lib/terms";
  import { HEARTBEAT_MS } from "$lib/sounds";
  import RuneRing from "../RuneRing.svelte";
  import FighterSilhouette from "../FighterSilhouette.svelte";
  import StadiumTag from "../StadiumTag.svelte";
  import ScrollBubble from "../speech/ScrollBubble.svelte";

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
    blank = false,
    ticker = {},
    callout = null,
    speech = { left: { id: 0, text: "", show: false }, right: { id: 0, text: "", show: false } },
    corner,
  }: {
    left: ArenaSide;
    right: ArenaSide;
    target: number; // first to
    status: ArenaStatus;
    context: string; // where the match sits, e.g. "Circle II, match 3 of 6"
    // This round's arena (null while its draw plays). key remounts the tag for a new draw.
    arena?: { stadium: string; round: number; spin: boolean; key: string | number } | null;
    onspindone?: () => void;
    // Death's Door: crimson glow and pill. Who is one point from winning also
    // gets a crimson pulse on their score; true is the glow alone.
    door?: boolean | "left" | "right" | "both";
    zoomed?: boolean; // match point after the slam: the portraits push in
    blank?: boolean; // Start match's build-up: only the backdrop shows
    ticker?: ArenaTicker;
    callout?: ArenaCallout | null;
    speech?: { left: ArenaSpeech; right: ArenaSpeech };
    corner?: Snippet; // something small for the top right corner (the TV's phone QR)
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
  // A score in double figures (the Reckoning is first to 9, so up to 11)
  // doesn't fit the column at full size: both scores step down together.
  const twoDigits = $derived((left.score ?? 0) > 9 || (right.score ?? 0) > 9);

  // ── Finish tags ─────────────────────────────────────────────────────
  // One tag per round won, in order, while they fit in two rows. A long match
  // (more than GROUP_OVER tags on a side, Winner included) counts them by
  // finish instead ("Endurance ×4 +4"), so they stay big enough to read
  // however long the match runs.
  const GROUP_OVER = 5;
  type Tag = { key: string; label: string; n: number; pts: number; rounds: number[] };
  function tagsOf(s: ArenaSide): { count: number; tags: Tag[] } {
    const extra = s.won ? 1 : 0;
    if (s.pills.length + extra <= GROUP_OVER) {
      const tags = s.pills.map((p) => ({ key: `r${p.i}`, label: p.label, n: 1, pts: p.pts, rounds: [p.i] }));
      return { count: tags.length + extra, tags };
    }
    const by = new Map<string, Tag>(); // in the order each finish first happened
    for (const p of s.pills) {
      const t = by.get(p.label) ?? { key: `g${p.label}`, label: p.label, n: 0, pts: 0, rounds: [] };
      t.n++;
      t.pts += p.pts;
      t.rounds.push(p.i);
      by.set(p.label, t);
    }
    return { count: by.size + extra, tags: [...by.values()] };
  }
  // Which tag each round is on, for the call-out to land on.
  const tagEls = new Map<number, HTMLElement>();
  function tagRef(el: HTMLElement, rounds: number[]) {
    let mine = rounds;
    const add = () => mine.forEach((i) => tagEls.set(i, el));
    const drop = () => mine.forEach((i) => tagEls.get(i) === el && tagEls.delete(i));
    add();
    return {
      update(next: number[]) {
        drop();
        mine = next;
        add();
      },
      destroy: drop,
    };
  }

  // ── The finish call-out ─────────────────────────────────────────────
  // Keep in step with the TV's CALLOUT_MS (the speech scrolls wait on it).
  const CALLOUT_MS = 1500;
  let fx = $state<ArenaCallout | null>(null); // the call-out in flight
  let fxEl = $state<HTMLElement>();
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
    const tag = tagEls.get(c.i);
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

{#snippet portrait(s: ArenaSide, lr: "l" | "r")}
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
  </div>
{/snippet}

{#snippet who(s: ArenaSide, lr: "l" | "r")}
  {@const { count, tags } = tagsOf(s)}
  <div class="who {lr}" class:won-side={s.won} class:lost-side={s.lost}>
    <div class="name" class:long={s.name.length > 16}>{s.name}</div>
    {#if count}
      <!-- Two full-size tags fit a row; any more go compact, in two rows at most. -->
      <div class="pills" class:compact={count > 2}>
        {#if s.won}<span class="fin winner">Winner</span>{/if}
        {#each tags as t (t.key)}
          <!-- The round in flight isn't counted until its call-out lands: a
               new tag hides, a counted one shows the count before it. -->
          {@const flying = !!fx && t.rounds.includes(fx.i)}
          {@const held = flying && t.n > 1 && fx ? fx.pts : 0}
          <span class="fin" class:waiting={flying && t.n === 1} use:tagRef={t.rounds}>
            {t.label}{#if t.n - (held ? 1 : 0) > 1}<i>×{t.n - (held ? 1 : 0)}</i>{/if}<b>+{t.pts - held}</b>
          </span>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<!-- A fighter's line, on a scroll under their portrait. Only fighters with a
     portrait speak. Outside the portrait's box, so the won/lost tints skip it. -->
{#snippet say(s: ArenaSide, lr: "l" | "r", line: ArenaSpeech)}
  {#if s.art}
    <div class="say {lr}">
      {#key line.id}<ScrollBubble text={line.text} show={line.show} />{/key}
    </div>
  {/if}
{/snippet}

<div class="arena" class:door={!!door} class:zoomed class:blank bind:clientWidth={w} style:--beat="{HEARTBEAT_MS}ms">
  <div class="canvas" style:transform="scale({scale})">
    <div class="rays"></div>
    <div class="dust" aria-hidden="true"><i></i><i></i><i></i></div>

    <!-- Everything but the backdrop: hidden for Start match's build-up. -->
    <div class="fg">
      <div class="mstat">
        <span class="pill {status}" class:battle={status === "battle" || status === "door"}>{PILL[status]}</span>
        {#if context}<span>{context}</span>{/if}
        {#if arena}
          {#key arena.key}
            <StadiumTag stadium={arena.stadium} round={arena.round} spin={arena.spin} ondone={onspindone} />
          {/key}
        {/if}
      </div>

      {@render portrait(left, "l")}
      {@render portrait(right, "r")}

      <div class="center" class:two={twoDigits}>
        <span class="score gold-text" class:brink={door === "left" || door === "both"} bind:this={scoreL}>{left.score ?? "–"}</span>
        <div class="orn"></div>
        <span class="score gold-text" class:brink={door === "right" || door === "both"} bind:this={scoreR}>{right.score ?? "–"}</span>
        <div class="ft">First to<b>{target}</b></div>
      </div>

      {@render who(left, "l")}
      {@render who(right, "r")}

      {@render say(left, "l", speech.left)}
      {@render say(right, "r", speech.right)}

      {#if corner}<div class="corner">{@render corner()}</div>{/if}

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
    </div>

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
  /* Gold motes rising through the light. Three sheets of scattered specks,
     each a different size, tile and speed, so no grid or rhythm shows. Each
     sheet is painted once, one tile taller than the screen, and only moved
     (transform), rising exactly one tile per loop. */
  .dust {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .dust i {
    --tile-w: 613px;
    --tile-h: 587px;
    --mote: rgba(255, 222, 165, 0.55);
    --r: 1.6px;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: calc(100% + var(--tile-h));
    background-size: var(--tile-w) var(--tile-h);
    background-image:
      radial-gradient(circle at 9% 14%, var(--mote) 0 var(--r), transparent calc(var(--r) + 1.4px)),
      radial-gradient(circle at 31% 71%, var(--mote) 0 calc(var(--r) * 0.7), transparent calc(var(--r) * 0.7 + 1.2px)),
      radial-gradient(circle at 48% 33%, var(--mote) 0 calc(var(--r) * 1.3), transparent calc(var(--r) * 1.3 + 1.6px)),
      radial-gradient(circle at 66% 88%, var(--mote) 0 var(--r), transparent calc(var(--r) + 1.4px)),
      radial-gradient(circle at 79% 47%, var(--mote) 0 calc(var(--r) * 0.6), transparent calc(var(--r) * 0.6 + 1.2px)),
      radial-gradient(circle at 93% 6%, var(--mote) 0 calc(var(--r) * 1.1), transparent calc(var(--r) * 1.1 + 1.4px));
    animation: rise 64s linear infinite;
  }
  .dust i:nth-child(2) {
    --tile-w: 431px;
    --tile-h: 467px;
    --mote: rgba(255, 214, 150, 0.4);
    --r: 1.1px;
    animation-duration: 97s;
    animation-delay: -31s;
  }
  .dust i:nth-child(3) {
    --tile-w: 877px;
    --tile-h: 743px;
    --mote: rgba(255, 236, 196, 0.8);
    --r: 2.4px;
    animation-duration: 53s;
    animation-delay: -17s;
  }
  @keyframes rise {
    to {
      transform: translate3d(0, calc(-1 * var(--tile-h)), 0);
    }
  }
  /* The screen's parts fade back in after Start match's build-up, which
     plays over the bare backdrop. Gone at once, back with a fade. */
  .fg {
    position: absolute;
    inset: 0;
    transition: opacity 0.3s ease-out;
  }
  .blank .fg {
    opacity: 0;
    transition: none;
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
  .two .score {
    font-size: 168px;
  }
  /* One point from winning: the score throbs crimson with the heartbeat, so
     the room can see whose door it is. */
  .score.brink {
    animation: brink var(--beat) ease-in-out infinite;
  }
  @keyframes brink {
    0%,
    100% {
      filter: drop-shadow(0 7px 0 #2b1806) drop-shadow(0 0 20px rgba(225, 30, 40, 0.6));
    }
    50% {
      filter: drop-shadow(0 7px 0 #2b1806) drop-shadow(0 0 30px rgba(255, 44, 54, 1)) drop-shadow(0 0 60px rgba(255, 44, 54, 0.8));
    }
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
  /* A gold lozenge with a dark face. The face is a second, smaller lozenge
     (::before), so the gold edge runs all the way round the points; a border
     would be cut off there by the clip. */
  .fin {
    --tip: 15px;
    position: relative;
    z-index: 0;
    font-family: var(--tf-font-display);
    font-size: 28px;
    line-height: 1.2;
    letter-spacing: 0.05em;
    padding: 10px 24px 8px;
    color: var(--ink);
    background: var(--gold);
    clip-path: polygon(var(--tip) 0, calc(100% - var(--tip)) 0, 100% 50%, calc(100% - var(--tip)) 100%, var(--tip) 100%, 0 50%);
    animation: pop 0.4s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  .fin::before {
    content: "";
    position: absolute;
    inset: 3px 4.5px;
    z-index: -1;
    background: linear-gradient(180deg, #23262d, #121418);
    clip-path: polygon(
      calc(var(--tip) - 2px) 0,
      calc(100% - var(--tip) + 2px) 0,
      100% 50%,
      calc(100% - var(--tip) + 2px) 100%,
      calc(var(--tip) - 2px) 100%,
      0 50%
    );
  }
  .pills.compact {
    gap: 8px 9px;
    margin-top: 9px;
  }
  .compact .fin {
    --tip: 12px;
    font-size: 22px;
    padding: 8px 19px 6px;
  }
  .fin b {
    font-weight: 400;
    color: #ffcf73;
    margin-left: 10px;
  }
  /* How many of this finish, once a long match counts them. */
  .fin i {
    font-style: normal;
    margin-left: 8px;
    color: #f3e6c4;
  }
  .fin.winner {
    background: #fff1c4;
    color: #2a1606;
  }
  .fin.winner::before {
    background: linear-gradient(180deg, #f6d27a, #b8801f);
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

  /* ── Speech ─────────────────────────────────────────────────────── */
  /* The scroll rests just above the name and grows upwards, over the foot of
     the portrait (the face is in the middle of the ring, so it stays clear).
     It covers North/South while it's up; the gem still shows the side. */
  .say {
    position: absolute;
    bottom: 276px; /* the names start at 710 of 972 */
    width: 640px;
    z-index: 7;
    pointer-events: none;
    --sb-max: 500px;
  }
  .say.l {
    left: 93px; /* centred on the portrait: 154 + 259 − 320 */
  }
  .say.r {
    right: 93px;
  }

  /* ── Top right corner ───────────────────────────────────────────── */
  /* Clear of the right portrait's ring (its edge is at 1761) and the status
     line. The bottom corners are taken by the finish tags and the strip. */
  .corner {
    position: absolute;
    top: 20px;
    right: 24px;
    z-index: 3;
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
    .dust i,
    .door .door-glow,
    .score.brink,
    .pill.battle::before {
      animation: none;
    }
    .push {
      transition: none;
    }
  }
</style>
