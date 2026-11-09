<script lang="ts">
  import { onMount } from "svelte";
  import IntroScene from "./IntroScene.svelte";
  import { AUDIO, DURATION } from "$lib/intro";

  // Plays the Beyfest intro once on the TV: the narration, with the scene
  // drawn from its clock, then `ondone`. `muted` (the TV's sound is off)
  // still plays it, silently. If the browser blocks sound until someone
  // clicks, it plays muted too and calls `onblocked`, so the TV can show its
  // "Sound is blocked" button.
  let {
    muted = false,
    ondone,
    onblocked,
  }: { muted?: boolean; ondone: () => void; onblocked?: () => void } = $props();

  let t = $state(0);
  let audio: HTMLAudioElement;

  onMount(() => {
    let raf = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ondone();
    };
    const frame = () => {
      t = audio.currentTime * 1000;
      if (audio.ended || t >= DURATION) finish();
      else raf = requestAnimationFrame(frame);
    };
    audio.muted = muted;
    audio.play().catch(() => {
      // Muted playback is always allowed, so the intro still runs.
      onblocked?.();
      audio.muted = true;
      audio.play().catch(finish);
    });
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      audio.pause();
    };
  });
</script>

<audio bind:this={audio} src={AUDIO} preload="auto"></audio>
<div class="player">
  <IntroScene {t} />
</div>

<style>
  .player {
    position: absolute;
    inset: 0;
    background: #000;
  }
</style>
