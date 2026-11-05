# Beyfest 2026 intro: storyboard

A 67-second anime-style prelude for the **event TV**, set to the narrated
monologue (`C:\Users\SeanK\Videos\2026-10-30 23-56-14.mp4`). It's a set of
stills and light animation built as a TV scene in the tournament app and synced
to the audio, like the royale intro. Image prompts are in
[`prompts/intro.md`](prompts/intro.md).

## The monologue (timed)

| Time (s) | Line |
|---|---|
| 3.3–10.2 | At the dawn of Beyfest, there came eight warriors, vying for the title of champion. |
| 11.5–18.9 | They battled till plastic cracked and metal sparked, till one stood over all, the Breycist. |
| 21.0–25.4 | Come the cold winds, and new challengers joined the fray. |
| 26.6–34.7 | But once again the Breycist could not be denied, as he vanquished all before him to claim the Winter League crown. |
| 36.4–42.5 | Nigh on a year has passed, and once again, ten brave souls will fight with cord and Bey. |
| 46.4–51.1 | Can the Breycist be stopped, or will he claim another victory in this? |
| 53.9–57.5 | Beyfest, 2026, triple threat! |

The video runs 67 s, so there are about 10 s after the last line. There's light
music under the narration; the audio goes into the app as it is.

## The rosters

| Event | Fighters |
|---|---|
| Beyfest (the first) | Buzzsaw, Breycist, Underdogger, Torque Warden, Stancemancer, Modsmith, Cheatseeker, Joyzerker |
| Winter League | Buzzsaw, Breycist, Torque Warden, Stancemancer, Modsmith, Joyzerker, **Fairy Dancer**, **Beanblader** (new) |
| Beyfest 2026 | Buzzsaw, Breycist, Underdogger, Torque Warden, Stancemancer, Cheatseeker, Joyzerker, Fairy Dancer, Beanblader, **Pugilist**, **Beyby** (new) |

The script says "ten brave souls" and the 2026 roster is 11. The user said
that doesn't matter.

## Approach

- **One place, three times.** Every act is set in the same arena, at dawn
  (the first Beyfest), in snow (the Winter League) and packed at night (2026).
  Plates B2 and B3 are made as **edits of B1**, like the Joyzerker's purple frame
  was made from the green one, so they line up and can cross-fade.
- **The fighters are the existing cut-outs**, laid over the plates as layers.
  That keeps every face on-model and means one new image per scene, not one per
  fighter. Only the Breycist gets new art, because the story is about him.
- **Light animation, all done in code:** slow push-ins, cut-outs sliding and
  slamming in, particles (haze, sparks, snow, embers), light flares, screen
  shake and impact flashes, plus katakana name cards like the VS intro. The
  Joyzerker's glitch loop plays wherever he appears.
- **Synced to the audio's clock**, not timers, so it can't drift. A lab page
  (like `/tv/lab/royale`) scrubs and freezes any moment for review.
- **Format:** the TV is 16:9; ChatGPT makes 1536×1024 (3:2). Each plate is
  cropped to 16:9 (losing 80 px top and bottom), so the prompts keep the
  important parts away from those edges.

## New images (9)

| ID | What | Kind | Made from |
|---|---|---|---|
| B1 | The arena at dawn, empty | Background plate | New |
| B2 | The same arena in snow at dusk, empty | Background plate | Edit of B1 |
| B3 | The same arena at night, packed, lights blazing | Background plate | Edit of B1 |
| C1 | The Breycist's and the Underdogger's Beyblades clashing, close-up, no people | Full scene | New |
| C2 | Hand rips the ripcord, the Beyblade launches at camera | Full scene | New |
| R1 | The Breycist stands over all | Cut-out (transparent) | New, from `breycist.png` |
| R2 | The Breycist with the Winter League crown, in the snow | Full scene | New, from `breycist.png` |
| R3 | The Breycist, menacing close-up | Full scene | New, from `breycist.png` |
| L1 | The Beyfest 2026 Triple Threat logo | Logo (transparent) | New, matching the BEYFEST lettering in the victory images |

**All nine were approved on 2026-11-01** and are in `approved/intro/` (notes
per image in [`prompts/intro.md`](prompts/intro.md)). R2 and R3 are cropped to
16:9 from the top, not the centre.

Everything else is already approved: the 11 cut-outs, their face points (for
the face montage) and the katakana names in `fighters.json`.

## Version 2: scenes, not cut-outs (2026-11-01)

Reviewing the first build, the user decided the fighters' cut-outs don't
work: they're character cards (one angle, one vortex each), so laid over the
arena they read as pasted on. Version 2 replaces every cut-out shot with a
generated scene that has the fighters *in* it: battles between two, and the
2026 field in **closer groups of three** (the user's choice over wide shots).
Animation stays minimal: slow pans and zooms, a gentle 3D tilt, particles,
cuts on the beats; the countdown and logo keep their slams.

Kept from version 1: B1–B3, C1, C2, R2, R3 and the logo. R1 is dropped.

### New images (9)

| ID | Line | Scene | Fighters | Made from |
|---|---|---|---|---|
| E1 | "there came eight warriors" | The eight arrive at the dawn arena, backlit by the sunrise | the first eight | Edit of B1 |
| P1 | "they battled till…" | The first final: launching at each other across the stadium | Breycist vs Underdogger | B1 as the setting |
| S1 | "one stood over all" | The Breycist on the stadium, the other seven beaten round him | the first eight | B1 as the setting |
| W1 | "new challengers joined the fray" | Walking in through the blizzard | Fairy Dancer, Beanblader | Edit of B2 |
| P2 | "could not be denied" | The end of the Winter League final: the Buzzsaw on his knees, screaming, his Bey in pieces, the Breycist smug above him | Breycist vs Buzzsaw | R2's frozen arena as the setting |
| G1 | "ten brave souls" | Ready, launchers raised | Buzzsaw, Underdogger, Torque Warden | B3 as the setting |
| G2 | (continues) | Ready, launchers raised | Stancemancer, Cheatseeker, Joyzerker | B3 as the setting |
| G3 | (music) | Ready, launchers raised | Fairy Dancer, Beanblader | B3 as the setting |
| N1 | (music, before "Can the Breycist…") | The new blood squares up to the champion | Pugilist and Beyby vs Breycist | B3 as the setting |

The ten challengers of 2026 are everyone but the Breycist, so "ten brave
souls" is right after all: G1–G3 and the two newcomers in N1.

### Shot list (version 2)

| Time (s) | Shot | Motion |
|---|---|---|
| 0–3.3 | Cold open: black, a red glint | as version 1 |
| 3.3–10.9 | **E1**, the eight at dawn | slow push-in; the light lifts on "champion" |
| 10.9–12.9 | **P1**, the first final | slow pan from the Underdogger to the Breycist |
| 12.9–15.3 | C1, the clash | shake on "cracked", sparks on "sparked" |
| 15.3–20.7 | **S1**, one stood over all | slow tilt up to him; name card on "the Breycist" |
| 20.7–26.4 | B2, then **W1** | snow; W1 fades in on "new challengers" |
| 26.4–32.2 | **P2**, the Winter League final | slow tilt up from the broken Bey to the two men; red embers |
| 32.2–36.3 | R2, the crown | as version 1 |
| 36.3–37.9 | R2 into B3: a year passes | as version 1, shorter |
| 37.9–39.9 | **G1** | slow pan |
| 39.9–41.7 | **G2** | slow pan the other way |
| 41.7–43.1 | C2, cord and Bey | as version 1 |
| 43.1–44.7 | **G3** | slow push-in |
| 44.7–46.3 | **N1** | slow push toward the Breycist |
| 46.3–51.4 | R3, can he be stopped | as version 1 |
| 51.4–end | Countdown, logo, hold | as version 1 |

### Version 2 built (2026-11-02)

All nine scenes approved and in `approved/intro/` (G1 with the Underdogger's
arm lengthened; N1 redone as the Breycist from behind, looking back over his
shoulder in villain lighting). The scene now shows every picture at its full
3:2 size and frames it with a slow camera (a framing at each end of the shot,
eased between them), so nothing is pre-cropped. E1 and W1 cross-fade in over
B1 and B2. Name cards: the Breycist on S1, the newcomers on W1, everyone in
G1–G3 and the challengers in N1.

**Softer pass (2026-11-02, the user's call):** the 3-2-1 countdown is gone (R3
holds until the title fades in). Every cut is a soft cross-fade (0.7–1 s; the
clash and the ripcord are quicker, to land on "cracked" and "cord"). Camera
moves are slow, small Ken Burns drifts across each shot's whole time on screen.
Only the clash and the logo shake the screen.

**More Ken Burns (2026-11-02, the user's call):** every move now runs at a
steady speed until the next shot has finished fading in over it, so nothing
stops moving mid-fade. The camera table (`CAMERA` in `src/lib/intro.ts`)
keeps every framing clear of the picture's edges, which a test checks: the
first pass had pans that hit an edge and stopped dead. The name cards are gone.

## Built (2026-11-01)

The scene is `tournament-app/web/src/lib/components/tv/IntroScene.svelte`,
timed by `src/lib/intro.ts` (word cues from Whisper on the audio file), with
the lab page at `/tv/lab/intro`. The images are made from `approved/intro/` by
`tools/prepare_intro_images.py`. Where it differs from the shot list below:

- Lineups are two staggered rows (back row smaller), not one line; the full
  cut-outs' energy vortexes crowded each other otherwise.
- Shot 12 has no row of challengers behind the Breycist: R3 is one flat
  scene. A dark half-shadow lifts and a red glint flashes in his eye instead.
- The face montage is slanted panels, filling in left to right, with each
  fighter's katakana running down their panel.

## Shot list

### Act 1: the first Beyfest (0–20.5 s)

**1. Cold open (0.0–3.3).** Black. A single red glint streaks across the
screen, then a faint spin whine. *Code only.*

**2. Eight warriors (3.3–10.8).** "At the dawn of Beyfest, there came eight
warriors, vying for the title of champion."
Plate B1, slow push-in, haze drifting. The original eight cut-outs rise into
place along the arena one by one (about 0.7 s apart), dark and backlit with a
warm rim light. On "champion" the sun clears the horizon and they light up in
full colour.

**3. The clash (10.8–15.3).** "They battled till plastic cracked and metal
sparked,"
C1, tight on the collision: the Breycist's red, black and silver Beyblade
against the Underdogger's amber and gold. Screen shake on "cracked", a burst
of sparks on "sparked".

**4. One stood over all (15.3–20.5).** "till one stood over all, the Breycist."
Back to B1, now in full morning light. R1, the Breycist, rises tall in the
centre, low angle; the other seven sink and darken below him. On "the
Breycist" his katakana card (ザ・ブレイシスト) slams in with a red flash.

### Act 2: the Winter League (20.5–36.0 s)

**5. Cold winds (20.5–26.0).** "Come the cold winds, and new challengers
joined the fray."
B1 cross-fades to B2 as wind blows snow in. The returning six stand frosted
and tinted blue. On "new challengers" the **Fairy Dancer** and **Beanblader**
slam in at the front in full colour, with their name cards.

**6. Could not be denied (26.0–31.5).** "But once again the Breycist could not
be denied, as he vanquished all before him"
Fast montage on a dark red background: each of the seven rivals appears for
about 0.6 s, a red slash of the Breycist's energy cuts across, and they drain
of colour and fall away. *Code only.*

**7. The crown (31.5–36.0).** "to claim the Winter League crown."
R2, slow zoom, snow falling. A gleam runs across the crown on "crown".

### Act 3: Beyfest 2026 (36.0–67.0 s)

**8. Nigh on a year (36.0–39.5).** "Nigh on a year has passed,"
Time passes: R2's snow slows and melts into rising embers, which drift up and
become the lights of B3 as it fades in. *Code only (plus B3).*

**9. Ten brave souls (39.5–41.6).** "and once again, ten brave souls"
B3. All eleven 2026 cut-outs slam into a lineup, about 0.2 s apart. The
newcomers, the **Pugilist** and **Beyby**, get an extra flash.

**10. Cord and Bey (41.6–43.0).** "will fight with cord and Bey."
C2: the cord rips, the Beyblade flies at the camera, white flash.

**11. Face montage (43.0–46.4).** *(music)*
Rapid close-ups of the eleven faces (about 0.3 s each), each cropped with its
saved face point, with its katakana name.

**12. Can he be stopped (46.4–51.5).** "Can the Breycist be stopped, or will he
claim another victory in this?"
R3, slow push-in toward his eyes. Behind him, the ten challengers stand in a
backlit row.

**13. Countdown (51.5–53.9).** *(music)* 3, 2, 1, each a hard flash and shake.

**14. Title (53.9–57.5).** "Beyfest, 2026, triple threat!"
B3, with all the fighters' Beyblade colours swirling. The logo (L1) builds
up one tier per word: **BEYFEST** (with ベイフェスト), **2026**, then
**TRIPLE THREAT**. The logo is cut into its three tiers in code.

**15. Hold (57.5–67.0).** The logo glows over the arena, then fades to black.
