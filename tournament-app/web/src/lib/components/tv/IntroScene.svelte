<script lang="ts">
  import {
    BOX_H,
    BOX_W,
    CUE,
    cameraAt,
    clamp,
    easeBack,
    easeIn,
    easeOut,
    easeSine,
    flash,
    frameTransform,
    lerp,
    prog,
    shake,
    visibleShots,
    type Shot,
  } from "$lib/intro";
  import IntroParticles from "./IntroParticles.svelte";

  // The Beyfest 2026 intro (see $lib/intro and fighter-art/INTRO-STORYBOARD.md).
  // Everything here is drawn from `t`, the narration's clock in ms; the page
  // that plays it owns the audio. Same canvas as the other TV scenes: a fixed
  // 1920×1080 stage scaled to fit. `lite` (the Pi) drops filters and most
  // particles.
  //
  // Each shot is a layer that fades in softly over the one before. Its picture
  // (3:2, in a 1920×1280 box that just covers the screen) drifts slowly, Ken
  // Burns style, at a steady speed across the whole time it's on screen, fades
  // included ($lib/intro's CAMERA).
  let { t, lite = false }: { t: number; lite?: boolean } = $props();

  let w = $state(1920);
  const scale = $derived(w / 1920);
  const shown = $derived(new Map(visibleShots(t).map((v) => [v.shot, v.opacity])));
  const on = (s: Shot) => shown.has(s);
  const opacity = (s: Shot) => shown.get(s) ?? 0;

  // The camera's transform for a shot's picture, right now.
  const cam = (s: Shot) => frameTransform(cameraAt(s, t), BOX_W, BOX_H);

  // Sunrise on "champion": the dawn half-light lifts.
  const sunrise = $derived(easeOut(prog(t, CUE.champion - 200, 1_200)));

  // Only the clash and the logo shake the screen.
  const HITS: [number, number][] = [[CUE.cracked, 14], [CUE.sparked, 10], [CUE.beyfest, 16], [CUE.year, 10], [CUE.triple, 18], [CUE.threat, 12]];
  const shakeXY = $derived.by(() => {
    let x = 0;
    let y = 0;
    for (const [at, px] of HITS) {
      const [dx, dy] = shake(t, at, px);
      x += dx;
      y += dy;
    }
    return [x, y];
  });

  const FLASHES: [number, number, number][] = [
    [CUE.cracked, 0.55, 350], [CUE.sparked, 0.4, 350], [CUE.bey, 0.5, 450],
    [CUE.beyfest, 0.8, 350], [CUE.year, 0.5, 300], [CUE.triple, 0.8, 350], [CUE.threat, 0.5, 300],
  ];
  const whiteFlash = $derived(Math.max(0, ...FLASHES.map(([at, k, ms]) => flash(t, at, ms) * k)));
  const redFlash = $derived(Math.max(flash(t, CUE.theBreycist, 700) * 0.25, flash(t, CUE.victory, 700) * 0.2));

  // The logo's tiers: when each slams in, from what scale.
  const LOGO: [number, number, string][] = [
    [CUE.beyfest, 1.8, "logo-1-beyfest"],
    [CUE.year, 1.6, "logo-2-year"],
    [CUE.triple, 2, "logo-3-triple-threat"],
  ];
  function slam(at: number, from = 1.6, ms = 260) {
    const p = prog(t, at, ms);
    return { opacity: clamp(p * 2.5), scale: lerp(from, 1, easeBack(p)) };
  }
</script>

<div class="intro" class:lite bind:clientWidth={w}>
  <div class="canvas" style:transform="scale({scale})">
    <div class="stage" style:transform="translate({shakeXY[0]}px, {shakeXY[1]}px)">
      <!-- ── Act 1: the first Beyfest ── -->
      {#if on("eight")}
        <div class="layer" style:opacity={opacity("eight")}>
          <div class="box" style:transform={cam("eight")}>
            <img src="/intro/b1-dawn.webp" alt="" />
            <!-- The eight arrive: E1 is B1 with them in it -->
            <img src="/intro/e1-eight.webp" alt="" style:opacity={easeSine(prog(t, 4_500, 2_200))} />
            <!-- The sun at its spot in B1, swelling as it clears the horizon -->
            <div class="sun" style:opacity={0.55 + 0.35 * flash(t, CUE.champion, 2_500)} style:transform="translate(-50%, -50%) scale({lerp(0.7, 1, sunrise) + 0.6 * flash(t, CUE.champion, 2_500)})"></div>
          </div>
          <IntroParticles {t} kind="haze" colour="#ffd9a0" count={14} {lite} />
          <div class="shade" style:background="#0b1030" style:opacity={0.45 * (1 - sunrise)}></div>
        </div>
      {/if}

      {#if on("final")}
        <div class="layer" style:opacity={opacity("final")}>
          <div class="box" style:transform={cam("final")}><img src="/intro/p1-first-final.webp" alt="" /></div>
          <IntroParticles {t} kind="embers" colour="#ffb347" count={60} at={10_450} {lite} />
        </div>
      {/if}

      {#if on("clash")}
        <div class="layer" style:opacity={opacity("clash")}>
          <div class="box" style:transform={cam("clash")}><img src="/intro/c1-clash.webp" alt="" /></div>
          <IntroParticles {t} kind="sparks" at={CUE.cracked} count={70} colour="#fff3c4" x={960} y={540} {lite} />
          <IntroParticles {t} kind="sparks" at={CUE.sparked} count={140} colour="#ffc94a" x={960} y={540} {lite} />
        </div>
      {/if}

      {#if on("overAll")}
        <div class="layer" style:opacity={opacity("overAll")}>
          <div class="box" style:transform={cam("overAll")}><img src="/intro/s1-stood-over-all.webp" alt="" /></div>
          <IntroParticles {t} kind="embers" colour="#ff3b2a" count={90} at={14_700} {lite} />
        </div>
      {/if}

      <!-- ── Act 2: the Winter League ── -->
      {#if on("winter")}
        <div class="layer" style:opacity={opacity("winter")}>
          <div class="box" style:transform={cam("winter")}>
            <img src="/intro/b2-winter.webp" alt="" />
            <!-- The new challengers walk in: W1 is B2 with them in it -->
            <img src="/intro/w1-challengers.webp" alt="" style:opacity={easeSine(prog(t, CUE.newChallengers - 500, 1_400))} />
          </div>
          <IntroParticles {t} kind="snow" colour="#ffffff" count={260} at={19_950} {lite} />
        </div>
      {/if}

      {#if on("denied")}
        <div class="layer" style:opacity={opacity("denied")}>
          <div class="box" style:transform={cam("denied")}><img src="/intro/p2-winter-final.webp" alt="" /></div>
          <IntroParticles {t} kind="snow" colour="#ffffff" count={160} at={25_400} {lite} />
          <IntroParticles {t} kind="embers" colour="#ff3b2a" count={70} at={25_400} {lite} />
        </div>
      {/if}

      {#if on("crown")}
        <div class="layer" style:opacity={opacity("crown")}>
          <div class="box" style:transform={cam("crown")}>
            <img src="/intro/r2-crown.webp" alt="" style:filter={lite ? undefined : `saturate(${1 - 0.7 * prog(t, CUE.nighOn, 1_500)})`} />
            <!-- A gleam across the crown on "crown" -->
            <div class="gleam-clip"><div class="gleam" style:transform="translateX({lerp(-500, 900, prog(t, CUE.crown - 200, 900))}px) skewX(-20deg)"></div></div>
            <div class="star" style="left: 1062px; top: 104px;" style:opacity={flash(t, CUE.crown + 200, 1_000)} style:transform="translate(-50%, -50%) scale({0.4 + prog(t, CUE.crown + 200, 1_000)}) rotate({t / 10}deg)"></div>
          </div>
          <IntroParticles {t} kind="snow" colour="#ffffff" count={200} at={31_100} opacity={1 - prog(t, CUE.nighOn, 1_200)} {lite} />
        </div>
      {/if}

      <!-- ── Act 3: Beyfest 2026 ── -->
      {#if on("year")}
        <div class="layer" style:opacity={opacity("year")}>
          <div class="box" style:transform={cam("year")}><img src="/intro/b3-night.webp" alt="" /></div>
          <IntroParticles {t} kind="embers" colour="#ffc94a" count={110} at={36_350} {lite} />
        </div>
      {/if}

      {#if on("g1")}
        <div class="layer" style:opacity={opacity("g1")}>
          <div class="box" style:transform={cam("g1")}><img src="/intro/g1-group.webp" alt="" /></div>
          <IntroParticles {t} kind="embers" colour="#ffc94a" count={50} at={37_350} opacity={0.7} {lite} />
        </div>
      {/if}

      {#if on("g2")}
        <div class="layer" style:opacity={opacity("g2")}>
          <div class="box" style:transform={cam("g2")}><img src="/intro/g2-group.webp" alt="" /></div>
          <IntroParticles {t} kind="embers" colour="#ffc94a" count={50} at={39_600} opacity={0.7} {lite} />
        </div>
      {/if}

      {#if on("cord")}
        <div class="layer" style:opacity={opacity("cord")}>
          <div class="box" style:transform={cam("cord")}><img src="/intro/c2-ripcord.webp" alt="" /></div>
          <IntroParticles {t} kind="sparks" at={CUE.bey} count={120} colour="#ffd36b" x={960} y={700} {lite} />
        </div>
      {/if}

      {#if on("g3")}
        <div class="layer" style:opacity={opacity("g3")}>
          <div class="box" style:transform={cam("g3")}><img src="/intro/g3-pair.webp" alt="" /></div>
          <IntroParticles {t} kind="embers" colour="#ffc94a" count={50} at={43_350} opacity={0.7} {lite} />
        </div>
      {/if}

      {#if on("newBlood")}
        <div class="layer" style:opacity={opacity("newBlood")}>
          <div class="box" style:transform={cam("newBlood")}><img src="/intro/n1-new-blood.webp" alt="" /></div>
          <IntroParticles {t} kind="embers" colour="#ff3b2a" count={70} at={45_500} {lite} />
        </div>
      {/if}

      {#if on("stopped")}
        <div class="layer" style:opacity={opacity("stopped")}>
          <div class="box" style:transform={cam("stopped")}>
            <img src="/intro/r3-menace.webp" alt="" />
            <div class="star red" style="left: 1072px; top: 498px;" style:opacity={flash(t, CUE.victory, 1_200)} style:transform="translate(-50%, -50%) scale({0.3 + prog(t, CUE.victory, 1_200)}) rotate({t / 8}deg)"></div>
          </div>
          <div class="half-shadow" style:opacity={lerp(0.5, 0.8, prog(t, 48_550, 5_000))}></div>
          <IntroParticles {t} kind="embers" colour="#ff3b2a" count={100} at={48_550} {lite} />
          <div class="shade" style:background="#ff2a1a" style:opacity={0.07 + 0.04 * Math.sin(t / 400)}></div>
        </div>
      {/if}

      {#if on("title")}
        <div class="layer" style:opacity={opacity("title")}>
          <div class="box" style:transform={cam("title")}><img src="/intro/b3-night.webp" alt="" /></div>
          <div class="shade" style:background="#000" style:opacity={0.5}></div>
          <div class="swirl" style:opacity={0.3} style:transform="translate(-50%, -50%) rotate({t / 40}deg)"></div>
          <IntroParticles {t} kind="embers" colour="#ffc94a" count={140} at={52_650} {lite} />
          <div class="glow gold" style:opacity={prog(t, 59_450, 900) * (0.45 + 0.15 * Math.sin(t / 500))}></div>
          <div class="logo" style:transform="scale({1 + 0.04 * flash(t, CUE.threat, 400)})">
            {#each LOGO as [at, from, file] (file)}
              {@const s = slam(at, from, 280)}
              <img src="/intro/{file}.webp" alt="" style:opacity={s.opacity} style:transform="scale({s.scale})" />
            {/each}
          </div>
          <div class="shade" style:background="#000" style:opacity={easeIn(prog(t, 63_800, 2_500))}></div>
        </div>
      {/if}
    </div>
    <div class="flash" style:opacity={whiteFlash}></div>
    <div class="flash red-flash" style:opacity={redFlash}></div>
  </div>
</div>

<style>
  .intro {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
  }
  .canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 1080px;
    transform-origin: 0 0;
    overflow: hidden;
  }
  .stage,
  .layer,
  .shade,
  .flash {
    position: absolute;
    inset: 0;
  }
  .layer {
    overflow: hidden;
  }
  /* A scene picture, scaled to just cover the screen; the camera moves it. */
  .box {
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 1280px;
    transform-origin: 0 0;
  }
  .box img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .lite .box img {
    filter: none !important;
  }
  .flash {
    background: #fff;
    pointer-events: none;
  }
  .red-flash {
    background: #ff1e1e;
  }

  /* ── Act 1 ── */
  /* At the sun in B1 (in the 1920×1280 box) */
  .sun {
    position: absolute;
    left: 956px;
    top: 479px;
    width: 900px;
    height: 900px;
    border-radius: 50%;
    background: radial-gradient(circle, rgb(255 250 220 / 0.95) 0%, rgb(255 210 120 / 0.5) 18%, rgb(255 160 60 / 0.15) 42%, transparent 68%);
  }

  /* ── Act 2 ── */
  .gleam-clip {
    position: absolute;
    left: 700px;
    top: 0;
    width: 700px;
    height: 260px;
    overflow: hidden;
    mix-blend-mode: screen;
  }
  .gleam {
    position: absolute;
    top: -40px;
    width: 120px;
    height: 360px;
    background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.85), transparent);
  }
  .star {
    position: absolute;
    width: 220px;
    height: 220px;
    background:
      linear-gradient(90deg, transparent 47%, #fff 50%, transparent 53%),
      linear-gradient(0deg, transparent 47%, #fff 50%, transparent 53%),
      radial-gradient(circle, #fff 0%, rgb(255 255 255 / 0.5) 12%, transparent 30%);
    pointer-events: none;
  }
  .star.red {
    background:
      linear-gradient(90deg, transparent 47%, #ff6a5a 50%, transparent 53%),
      linear-gradient(0deg, transparent 47%, #ff6a5a 50%, transparent 53%),
      radial-gradient(circle, #fff 0%, rgb(255 60 40 / 0.6) 14%, transparent 32%);
  }

  /* ── Act 3 ── */
  .half-shadow {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgb(0 0 0 / 0.9) 0%, rgb(0 0 0 / 0.55) 30%, transparent 52%);
    pointer-events: none;
  }
  .swirl {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 2400px;
    height: 2400px;
    border-radius: 50%;
    background: conic-gradient(#e63329, #ffc700, #19b25a, #1f6fff, #9b4dff, #ff4fa3, #e63329);
    -webkit-mask: radial-gradient(circle, #000 0%, transparent 60%);
    mask: radial-gradient(circle, #000 0%, transparent 60%);
  }
  .glow.gold {
    position: absolute;
    left: 260px;
    top: -110px;
    width: 1400px;
    height: 1300px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgb(255 210 100 / 0.6) 0%, rgb(255 150 40 / 0.2) 40%, transparent 70%);
    pointer-events: none;
  }
  .logo {
    position: absolute;
    left: 210px;
    top: 34px;
    width: 1500px;
    height: 1015px;
  }
  .logo img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
