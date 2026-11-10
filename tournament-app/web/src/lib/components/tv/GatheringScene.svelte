<script lang="ts">
  import { BLADER } from "$lib/terms";
  import LiveQr from "./LiveQr.svelte";

  // The Gathering: the waiting screen before the Circles are drawn. The logo,
  // when and where, everyone who has signed in so far, and a big QR code to
  // sign in with. It fills the whole TV (it carries the logo itself, so there
  // is no top bar): a 1920×1080 canvas scaled to the width it's given.
  let {
    when,
    names,
    qr,
    url,
  }: {
    when: string; // "March 2027 · Venue TBC"
    names: string[]; // signed in so far
    qr: { size: number; path: string };
    url: string; // the phone page's address, shown under the code
  } = $props();

  let w = $state(1920);
  const scale = $derived(w / 1920);
  const count = $derived(`${names.length} ${names.length === 1 ? BLADER.one : BLADER.many} gathered`);
</script>

<div class="gathering" bind:clientWidth={w}>
  <div class="canvas" style:transform="scale({scale})">
    <div class="rays"></div>
    <div class="left">
      <img class="logo" src="/logo-tetrafatalis.webp" alt="Beyfest: Tetrafatalis" />
      <p class="when">{when}</p>
      {#if names.length}
        <div class="who">
          <span class="tf-carved" data-t={count}>{count}</span>
          <div class="names" class:many={names.length > 12}>
            {#each names as n (n)}<span>{n}</span>{/each}
          </div>
        </div>
      {/if}
    </div>
    <div class="card">
      <span class="tf-carved" data-t="Answer the summons">Answer the summons</span>
      <div class="code"><LiveQr size={qr.size} path={qr.path} px={400} /></div>
      <p>Scan to sign in on your phone.<br /><b>The Circles are drawn once all have gathered.</b></p>
      <p class="url">{url}</p>
    </div>
  </div>
</div>

<style>
  .gathering {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: radial-gradient(ellipse 80% 80% at 50% 50%, #23232b, #08080b 78%);
  }
  .canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 1920px;
    height: 1080px;
    transform-origin: 0 0;
    font-family: var(--tf-font-text);
    color: #f3e6c4;
  }
  .rays {
    position: absolute;
    inset: -20%;
    opacity: 0.1;
    mix-blend-mode: screen;
    background: repeating-conic-gradient(from 180deg at 50% -4%, rgba(255, 214, 140, 0.9) 0deg 3deg, rgba(255, 214, 140, 0) 6deg 14deg);
    mask: linear-gradient(180deg, #000 10%, transparent 80%);
  }
  .left {
    position: absolute;
    left: 110px;
    top: 0;
    bottom: 0;
    width: 800px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 26px;
    text-align: center;
  }
  .logo {
    width: 720px;
    filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.8));
  }
  .when {
    font-size: 44px;
    font-variant: small-caps;
    letter-spacing: 0.12em;
    color: #e9cf8e;
  }
  .who .tf-carved {
    font-size: 40px;
    --stroke: 6px;
  }
  .names {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    margin-top: 18px;
  }
  /* A stone tag per person. */
  .names span {
    font-family: var(--tf-font-carved);
    font-weight: 900;
    font-size: 24px;
    text-transform: uppercase;
    color: #f6ecd2;
    padding: 7px 18px 5px;
    background: linear-gradient(180deg, #3d4049, #1b1d23);
    border-radius: 4px;
    box-shadow:
      0 0 0 2px #eab13a,
      0 0 0 4px #1c0c04;
    animation: tag-in 0.4s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  .names.many span {
    font-size: 19px;
    padding: 5px 13px 4px;
  }
  @keyframes tag-in {
    from {
      transform: scale(0);
    }
  }
  .card {
    position: absolute;
    right: 150px;
    top: 50%;
    transform: translateY(-50%);
    width: 620px;
    padding: 40px 40px 36px;
    text-align: center;
    background: linear-gradient(180deg, #3d4049, #1b1d23);
    border-radius: 10px;
    box-shadow:
      0 0 0 4px #eab13a,
      0 0 0 8px #1c0c04,
      0 14px 0 #000,
      0 22px 40px rgba(0, 0, 0, 0.6);
  }
  .card .tf-carved {
    font-size: 38px;
    --stroke: 6px;
  }
  .code {
    width: 400px;
    margin: 30px auto 26px;
    box-shadow:
      0 0 0 6px #eab13a,
      0 0 0 11px #1c0c04;
  }
  .card p {
    font-size: 34px;
    line-height: 1.25;
    color: #e9cf8e;
  }
  .card b {
    color: #fff1c4;
  }
  .card .url {
    margin-top: 14px;
    font-size: 26px;
    color: #b9ab8c;
  }
  @media (prefers-reduced-motion: reduce) {
    .names span {
      animation: none;
    }
  }
</style>
