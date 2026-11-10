<script lang="ts">
  import { artFor, faceCrop, type Face } from "$lib/fighters";
  import { TITLES } from "$lib/terms";
  import FighterSilhouette from "./FighterSilhouette.svelte";

  // STILL STANDING: the Grand Mêlée's screen after a Skirmish or the Last
  // Stand, in the Carved look. The battle's name on a stone plate, STILL
  // STANDING slamming down over a turning gold burst, then everyone it sends
  // through to the Final Mêlée lands in a gold ring each. A Skirmish whose
  // runner-up goes to the Last Stand says so along the bottom. The call
  // ("[A] and [B]… still standing!") starts as the rings land (QUALIFIED_CALL
  // in sounds.ts). It then holds until `leaving` is set, plays its exit, and
  // calls ondone.
  //
  // A fixed 1920×1080 canvas scaled to fit; every time is
  // `calc(Nms * var(--k))`, so `slow` stretches it (lab only).
  // face: where the face is in the cut-out, to centre it in the ring.
  type Fighter = { name: string; kana?: string; img: string; imgMirrored?: string; mirror?: boolean; face?: Face | null };
  let {
    fighters,
    label = "", // "Skirmish I", "Last Stand"
    toSudden = "", // a Skirmish's runner-up who goes to the Last Stand
    slow = 1,
    leaving = false, // set to play the exit; ondone fires when it's over
    ondone,
  }: {
    fighters: Fighter[];
    label?: string;
    toSudden?: string;
    slow?: number;
    leaving?: boolean;
    ondone?: () => void;
  } = $props();

  // Timeline (ms at normal speed). Keep in step with the CSS delays below:
  //    0  backdrop, the plate · 150 STILL STANDING slams, flash
  //  550+ a ring every 110 ms · then the line along the bottom
  //   then it holds until `leaving`; the exit takes EXIT ms.
  const EXIT = 600;

  const n = $derived(fighters.length);
  // More fighters, smaller rings and names, so the row still fits.
  const ring = $derived(n <= 2 ? 340 : n <= 3 ? 300 : n <= 4 ? 250 : 200);
  const nameSize = $derived(n <= 2 ? 46 : n <= 3 ? 38 : n <= 4 ? 30 : 24);

  // The ring's portrait: the cut-out zoomed onto the face, the left half of
  // the row turned to face the middle (cut-outs face left).
  function art(f: Fighter, i: number) {
    const wantFlip = (i < n / 2) !== !!f.mirror;
    const a = artFor(f, wantFlip);
    const face = f.face && wantFlip && !a.flip ? { ...f.face, x: 1 - f.face.x } : (f.face ?? null);
    return { src: a.src, style: faceCrop(face, 0.42, a.flip) };
  }

  let w = $state(1920);
  const scale = $derived(w / 1920);

  $effect(() => {
    if (!leaving) return;
    const t = setTimeout(() => ondone?.(), EXIT * slow);
    return () => clearTimeout(t);
  });
</script>

<div class="q" class:leaving bind:clientWidth={w} style:--k={slow}>
  <div class="canvas" style:transform="scale({scale})">
    <div class="backdrop"></div>
    <div class="burst-wrap"><div class="burst"></div></div>
    <div class="shake">
      {#if label}<div class="ctx"><span>{TITLES.royale} · {label}</span></div>{/if}
      <div class="head">
        <span class="tf-carved" data-t={TITLES.royaleQualified}>{TITLES.royaleQualified}</span>
      </div>
      <div class="row" style:--d="{ring}px" style:--name="{nameSize}px">
        {#each fighters as f, i (i)}
          <div class="who" style:--i={i}>
            <div class="ring">
              {#if f.img}
                {@const a = art(f, i)}
                <img src={a.src} alt="" style={a.style} />
              {:else}
                <div class="sil"><FighterSilhouette flip={i < n / 2} /></div>
              {/if}
            </div>
            <span class="tf-carved stone" data-t={f.name}>{f.name}</span>
          </div>
        {/each}
      </div>
      <p class="foot" style:--at="{700 + n * 110}ms">
        {#if toSudden}
          <b>{toSudden}</b> fights on in the <b>{TITLES.royaleSuddenDeath}</b>
        {:else}
          {n === 1 ? "Goes" : n === 2 ? "Both go" : "All go"} on to the <b>{TITLES.royaleFinal}</b>
        {/if}
      </p>
    </div>
    <div class="flash"></div>
  </div>
</div>

<style>
  .q {
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
  .burst-wrap {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 2400px;
    height: 2400px;
    margin: -1200px 0 0 -1200px;
    opacity: 0.35;
    mix-blend-mode: screen;
    mask: radial-gradient(circle, #000 0, transparent 60%);
    animation: fade-in calc(500ms * var(--k)) linear calc(150ms * var(--k)) both;
  }
  .burst {
    position: absolute;
    inset: 0;
    background: repeating-conic-gradient(rgba(255, 200, 90, 0.85) 0 4deg, transparent 4deg 12deg);
    animation: turn calc(70s * var(--k)) linear infinite;
  }
  @keyframes turn {
    to {
      transform: rotate(360deg);
    }
  }
  .shake {
    position: absolute;
    inset: 0;
    animation: shake calc(360ms * var(--k)) linear calc(150ms * var(--k)) both;
  }
  @keyframes shake {
    0%,
    100% {
      transform: none;
    }
    20% {
      transform: translate(-14px, 9px);
    }
    45% {
      transform: translate(11px, -7px);
    }
    70% {
      transform: translate(-6px, 4px);
    }
  }

  .ctx {
    position: absolute;
    left: 0;
    right: 0;
    top: 50px;
    text-align: center;
  }
  .ctx span {
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
  .head {
    position: absolute;
    left: 0;
    right: 0;
    top: 150px;
    text-align: center;
    animation: slam calc(300ms * var(--k)) cubic-bezier(0.2, 1.5, 0.4, 1) calc(150ms * var(--k)) both;
  }
  .head .tf-carved {
    font-size: 130px;
    --stroke: 16px;
    --drop: 10px;
  }
  @keyframes slam {
    from {
      opacity: 0;
      transform: scale(2.2);
    }
  }

  .row {
    position: absolute;
    left: 0;
    right: 0;
    top: 400px;
    display: flex;
    justify-content: center;
    gap: calc(var(--d) * 0.3);
  }
  .who {
    text-align: center;
    animation: land calc(360ms * var(--k)) cubic-bezier(0.2, 1.4, 0.4, 1) calc((550ms + var(--i) * 110ms) * var(--k)) both;
  }
  @keyframes land {
    from {
      opacity: 0;
      transform: translateY(-120px) scale(1.3);
    }
  }
  .ring {
    position: relative;
    width: var(--d);
    height: var(--d);
    margin: 0 auto;
    border-radius: 50%;
    overflow: hidden;
    background: radial-gradient(circle at 50% 35%, #3a3f55, #101218 78%);
    box-shadow:
      0 0 0 9px var(--gold),
      0 0 0 15px var(--edge),
      0 0 70px rgba(255, 170, 50, 0.5);
  }
  /* Without a face point: full height, centred. faceCrop's inline style wins. */
  .ring img {
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
  .who .tf-carved {
    display: block;
    width: max-content;
    margin: 28px auto 0;
    font-size: var(--name);
    --stroke: 7px;
  }

  .foot {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 60px;
    text-align: center;
    font-size: 36px;
    color: #e9cf8e;
    animation: fade-in calc(400ms * var(--k)) linear calc(var(--at) * var(--k)) both;
  }
  .foot b {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    text-transform: uppercase;
    color: #f6ecd2;
  }

  .flash {
    position: absolute;
    inset: 0;
    background: #fff3c9;
    opacity: 0;
    pointer-events: none;
    animation: flash calc(320ms * var(--k)) ease-out calc(150ms * var(--k)) both;
  }
  @keyframes flash {
    0% {
      opacity: 0.85;
    }
    100% {
      opacity: 0;
    }
  }

  .leaving .canvas {
    animation: fade-out calc(600ms * var(--k)) ease-in both;
  }

  @media (prefers-reduced-motion: reduce) {
    .burst {
      animation: none;
    }
  }
</style>
