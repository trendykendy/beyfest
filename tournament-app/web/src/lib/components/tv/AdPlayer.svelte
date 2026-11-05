<script lang="ts">
  import { onMount } from "svelte";
  import AdScene from "./AdScene.svelte";
  import { adImages, type Ad } from "$lib/ads";

  // Plays one ad on the TV: its sound, with the pictures drawn from the
  // sound's clock, then `ondone`. Works like IntroPlayer: `muted` (the TV's
  // sound is off) still plays it silently, and if the browser blocks sound it
  // plays muted and calls `onblocked`.
  let {
    ad,
    muted = false,
    ondone,
    onblocked,
  }: { ad: Ad; muted?: boolean; ondone: () => void; onblocked?: () => void } = $props();

  let t = $state(0);
  let audio: HTMLAudioElement;

  onMount(() => {
    let raf = 0;
    let done = false;
    let gone = false;
    const finish = () => {
      if (done) return;
      done = true;
      ondone();
    };
    const frame = () => {
      t = audio.currentTime * 1000;
      if (audio.ended || t >= ad.duration) finish();
      else raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (gone) return;
      audio.muted = muted;
      audio.play().catch(() => {
        onblocked?.();
        audio.muted = true;
        audio.play().catch(finish);
      });
      raf = requestAnimationFrame(frame);
    };
    // The cuts land on the sound, so have every picture ready first. One that
    // fails to load shouldn't stop the ad.
    const decoding = adImages(ad).map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => {});
    });
    Promise.all(decoding).then(start);
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      audio.pause();
    };
  });
</script>

<audio bind:this={audio} src={ad.audio} preload="auto"></audio>
<div class="player">
  <AdScene {ad} {t} />
</div>

<style>
  .player {
    position: absolute;
    inset: 0;
    background: #000;
  }
</style>
