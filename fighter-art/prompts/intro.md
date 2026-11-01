# Beyfest 2026 intro: prompts

The nine new images for the intro. The shots they're used in are in
[`INTRO-STORYBOARD.md`](../INTRO-STORYBOARD.md). Same workflow as the
fighters: ChatGPT in the built-in browser, the user attaches, Claude types.

**One chat per image**, except B2 and B3, which are edits of B1 in B1's chat
so they stay aligned.

## Results (2026-11-01): all nine approved

All are in `approved/intro/`; earlier tries and the attachment folders
(`attach-B1`, `attach-R`, `attach-L`) are in `candidates/intro/` (not committed).

| ID | File | Notes |
|---|---|---|
| B1 | `B1-dawn.png` | First try. The sun came out just above the horizon; the sunrise is done in code. |
| B2 | `B2-winter.png` | Edit of B1, same chat. Lines up with B1 exactly (0 px). |
| B3 | `B3-night.png` | Edit of B1 ("the ORIGINAL dawn image"), same chat. Lines up to 1 px. Crowd hands poke into the bottom corners. |
| C1 | `C1-clash.png` | First try. The blurred background shows stadium lights. |
| C2 | `C2-ripcord.png` | First try. The Beyblade came out red and silver, so it reads as the Breycist's. |
| R1 | `R1-stood-over-all.png` | Three fixes, see below. Transparent cut-out. |
| R2 | `R2-crown.png` | First try, with the head and ear wording. **Crop 16:9 from the top**, or the crown is cut off. Little red energy; added in code. |
| R3 | `R3-menace.png` | First try. **Crop 16:9 from the top.** The half-face shadow is milder than asked; deepen it in code. |
| L1 | `L1-logo.png` | First try, transparent, spelled right. The three tiers touch (one connected shape), so code splits them along the thinnest seam. TRIPLE THREAT's tips touch the bottom edge; pad it. |

**Lessons**
- Edits in the same chat kept the plates aligned, as with the Joyzerker.
- "Head in natural proportion, ears small and close to the head" and the full
  hair description in the first prompt got R2 and R3 right first time.
- ChatGPT stacks logo tiers tightly even when asked for gaps.
- Saving: Downloads often leaves the file as a `.tmp` for a while; copy it by
  its byte size if the named file isn't there yet.

## Shared blocks

### Scene style (paste into every prompt)

> Anime key-visual illustration, like a still from a modern anime opening or a
> fighting-game cutscene. Match the hand-drawn rendering of the style reference
> exactly: confident inked line work whose weight varies like a pen, thicker on
> outer contours; crisp cel-shadow shapes; sharp-edged highlights; bright,
> saturated colour; dramatic cinematic lighting. Fine hand-drawn detail, but no
> heavy comic-book cross-hatching, no airbrushed gradients, no soft blur, no
> photorealism. Landscape 3:2. The image will be cropped to 16:9, so keep
> everything important away from the top and bottom edges. No text, letters,
> numbers, logos or emblems anywhere.

### The Breycist (paste into R1, R2 and R3)

> The man is the same character as the character reference: hand-drawn anime,
> but with his broad round face, full lifted cheeks, soft rounded jaw, fair skin
> with ruddy cheeks, ears that stand out slightly, clearly adult late-30s
> proportions, no glasses, clean-shaven. Short brown hair, soft and tousled,
> close at the sides, not shaved and **no sharp spikes**. White zip-up tracksuit
> with green, white and red stripes down the sleeves and legs and red collar
> lining, black wristwatch. His signature colours are red, white and green with
> black-and-silver accents; his Beyblade is red, black and silver, with a plain
> centre and no crest. Colour stays off his skin and hair.

### Attachments

| For | Attach | Label it as |
|---|---|---|
| Plates and scenes | `approved/royale-victory-breycist.png` | Style reference: "match the rendering of the arena, crowd and lights; do not copy the man, the trophy or any lettering" |
| The Breycist (R1–R3) | `approved/breycist.png` | Character reference: "keep his face, hair, build, outfit and Beyblade; not the pose" |
| The Breycist (R1–R3) | `reference-photos/breycist/upload/1b-style-pugilist-face.png` | Rendering reference for the face: "match the line and highlight detail; do not copy his face, glasses or beard" |

---

## B1: the arena at dawn (plate)

Attach: the style reference.

> Please generate a new image. The attached image is the STYLE REFERENCE only:
> match its rendering, not its content.
>
> [Scene style block]
>
> An empty, legendary open-air Beyblade arena at dawn, seen wide from a low
> angle. A large round Beyblade stadium bowl sits in the centre on a raised stone
> stage, with tiered stone stands curving around it and tall banners on poles
> (plain cloth, no symbols). Behind the arena, a range of hills; the sun is just
> below the horizon, filling the sky with gold, orange and deep blue, and shafts
> of light cut through low morning haze. Epic and quiet, like the opening shot
> of a legend. No people anywhere. Leave open space on the stage around the
> stadium and along the front of the stands, where characters will be added
> later.

## B2: the arena in winter (edit of B1)

Same chat as B1.

> Edit this image. Keep the camera, composition and every structure exactly
> where they are: the stadium, the stage, the stands, the banners and the hills
> must line up perfectly with the original. Change only the season and time:
> deep winter at dusk. Thick snow on the stage, the stands, the stadium rim and
> the hills; frost on the banners; snow falling and blowing in a cold wind. The
> sky is cold blue and violet with the last pale light low on the horizon. Still
> no people. Same rendering.

## B3: the arena in 2026 (edit of B1)

Same chat as B1.

> Edit the ORIGINAL dawn image (not the winter one). Keep the camera,
> composition and every structure exactly where they are, lined up perfectly
> with the original. Change it to a huge night-time championship event: the
> stands packed with a cheering crowd drawn as silhouettes and glow sticks;
> stadium lights and coloured spotlights sweeping the sky; giant screens, light
> rigs and pyrotechnic sparks around the stage; the banners now bright and new
> (plain, no symbols). The stage and stadium are lit up and empty, ready for the
> fighters. Electric and huge, like the opening night of a tournament. No text
> on any screen or banner. Same rendering.

## C1: the clash (scene)

Attach: the style reference.

> Please generate a new image. The attached image is the STYLE REFERENCE only:
> match its rendering, not its content.
>
> [Scene style block]
>
> An extreme close-up inside a Beyblade stadium bowl at the moment two
> Beyblades smash into each other at full speed. Left: a red, black and silver
> Beyblade in a red and white vortex. Right: an amber, gold and black Beyblade
> in a vortex of orange fire. Both motion-blurred and spinning
> in glowing vortexes of their colours. At the point of impact, a burst of white
> and gold metal sparks and small shards of cracked plastic flying outward, with
> anime speed lines and an impact flash. The camera is low, level with the bowl
> floor. Both Beyblades have plain centres with no crest or emblem. No people,
> no hands.

## C2: cord and Bey (scene)

Attach: the style reference.

> Please generate a new image. The attached image is the STYLE REFERENCE only:
> match its rendering, not its content.
>
> [Scene style block]
>
> A dynamic close-up of the launch, seen from just in front of the launcher. One
> hand grips a Beyblade launcher; the other hand rips a plain ripcord out of it
> in a blur, with no handle, grip or ring on the cord's end. The Beyblade has
> just left the launcher and flies straight toward the camera, spinning in a
> blazing vortex of light and sparks, the brightest thing in the image. Anime
> speed lines radiate from the centre. Background: a blurred arena full of light
> at night. Only the hands and forearms are visible, in black fingerless gloves;
> no face. Exactly one launcher, one ripcord and one Beyblade, with nothing
> connecting the Beyblade to the launcher. The Beyblade has a plain centre.

## R1: the Breycist stands over all (cut-out)

Attach: the style reference, the character reference and the face rendering
reference.

> Please generate a new image. Three images are attached. IMAGE 1 (arena):
> the style reference for rendering only. IMAGE 2 (man in a white tracksuit):
> the character reference. IMAGE 3 (close-up of a man's head): match its line
> and highlight detail; do not copy his face, glasses or beard.
>
> [Scene style block, but replace "Landscape 3:2 … edges." with: "Portrait
> 2:3. Transparent background: no scenery, no floor, no vignette, clean edges."]
>
> [The Breycist block]
>
> Full body, seen from a low angle so he towers over the viewer: the champion
> who stood over all. He stands tall and still, feet apart, chin raised, looking
> down at the viewer with a cocky, exaggerated anime smirk pulled up hard on one
> side, one eyebrow raised high, eyes half-lidded. His launcher hangs at his
> side in one hand; the plain ripcord dangles from the other hand. His
> tracksuit jacket and hair stir in a wind. Red and white energy crackles
> around his feet and rises behind him like flames. Exactly one launcher and one
> ripcord, no Beyblade in this image.

**Result (2026-11-01): approved after three fixes**, all in the same chat:
1. The first try had the right pose and smirk, but the face was too lean, the
   hair spiky, and the "transparent" background a painted checkerboard.
2. Edit: face rounder, cheeks fuller, jaw softer; hair soft and flat, no spikes.
3. **Remove BG** (in the image viewer) gave a clean cut-out.
4. Edit in the viewer: head about 15% smaller, the over-large ear (right of the
   image) smaller. The transparency survived this edit.

`approved/intro/R1-stood-over-all.png`, with the figure's alpha set to fully
solid (it came out at 252–253). **For R2 and R3:** say "head in natural
proportion to the body, ears small and close to the head" up front.

## R2: the Winter League crown (scene)

Attach: the style reference, the character reference and the face rendering
reference.

> Please generate a new image. Three images are attached. IMAGE 1 (arena):
> the style reference for rendering only. IMAGE 2 (man in a white tracksuit):
> the character reference. IMAGE 3 (close-up of a man's head): match its line
> and highlight detail; do not copy his face, glasses or beard.
>
> [Scene style block]
>
> [The Breycist block]
>
> The Winter League champion. He stands on a snow-covered Beyblade stadium in a
> frozen arena at dusk, snow falling around him, wearing a crown made of
> gleaming ice crystals with a red jewel at the front. He is framed from the
> waist up, slightly low angle, holding his launcher across his chest. His
> expression: a triumphant, exaggerated anime grin, lopsided, one brow raised,
> eyes bright with victory. Cold blue light around him, with his red energy
> glowing warm against the snow. His face and crown are clearly visible in the
> middle of the image.

## R3: can the Breycist be stopped? (scene)

Attach: the style reference, the character reference and the face rendering
reference.

> Please generate a new image. Three images are attached. IMAGE 1 (arena):
> the style reference for rendering only. IMAGE 2 (man in a white tracksuit):
> the character reference. IMAGE 3 (close-up of a man's head): match its line
> and highlight detail; do not copy his face, glasses or beard.
>
> [Scene style block]
>
> [The Breycist block]
>
> A menacing close-up, from the chest up, like a rival's reveal in an anime.
> He is lit from below and behind by red light, one side of his face in deep
> shadow; his eyes glint with a red glow. He wears the ice crown from the
> Winter League, now a little cracked, and a championship belt over his
> shoulder (plain gold plate, no lettering). His expression: a slow, confident,
> exaggerated villain's smirk, eyes narrowed, daring the viewer to try. The
> background is dark, with red energy and embers swirling behind him. His face
> is in the centre of the image.

## L1: the Beyfest 2026 Triple Threat logo

The victory images already have a BEYFEST wordmark (chrome letters, a crown
above, ベイフェスト below), so the logo builds on that. It's stacked in three
tiers with clear gaps, so code can cut it apart and slam in one tier per word.

Attach: `approved/victory-breycist.png`, labelled "the existing BEYFEST
wordmark is on the left: match its lettering style, crown and katakana; ignore
everything else".

> Please generate a new image: a logo for an anime-style Beyblade tournament
> intro, on a transparent background. The attached image shows the existing
> BEYFEST wordmark on the left: match its lettering style, crown and katakana,
> and ignore everything else in it.
>
> Three tiers, stacked and centred, with clear transparent space between them:
> 1. **BEYFEST** in big bold chrome letters with a crown above, and ベイフェスト
>    in red beneath, like the existing wordmark but bigger and more dramatic.
> 2. **2026** in bold gold metallic numbers.
> 3. **TRIPLE THREAT** in sharp, aggressive red-and-gold lettering with a
>    subtle glow, like the title of an anime fighting tournament arc.
>
> Exactly that text and nothing else, spelled exactly as written. Crisp edges,
> no background, no scenery, no glow spilling across the whole canvas. Landscape
> 3:2, the logo filling most of the width.
