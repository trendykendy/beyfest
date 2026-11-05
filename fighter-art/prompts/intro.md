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

---

# Version 2: scenes with the fighters in them (2026-11-01)

The cut-outs didn't work laid over the arena, so version 2 puts the fighters
into generated scenes (see "Version 2" in `INTRO-STORYBOARD.md`). Nine new
images: E1, P1, S1, W1, P2, G1, G2, G3 and N1.

## Rules for scenes with several fighters

- **Attach each fighter's approved cut-out** as their character reference, and
  name them in the prompt by what they wear ("the man in the white tracksuit"),
  since ChatGPT can't see file names. E1 and S1 have eight fighters, so they get
  one **reference sheet** (`candidates/intro/attach-v2/sheet-first-eight.png`,
  the eight cut-outs in a labelled grid) in place of eight attachments.
- **Three fighters at most with clear faces.** In E1 and S1 the faces are small
  or turned away, and outfits carry the likeness.
- Each fighter keeps their own palette on their clothes and energy; colour stays
  off skin and hair. Launchers in hand; no Beyblade tethered to a launcher.
- One chat per image. Edits (E1 from B1, W1 from B2) go in a new chat with the
  plate attached, plus "keep the arena exactly as it is".
- Same scene style block as version 1, with "head in natural proportion, ears
  small" for every face.

## The fighters, in a line each

Paste the lines for the fighters in the image, after the style block.

- **The Breycist:** [version 1's Breycist block]
- **The Underdogger:** tall; long, swept-back light blond hair to the jaw, a short brown beard and moustache, a rugged grin; a studded dark leather waistcoat with glowing bronze and orange trim over a cream tech shirt with torn sleeves, spiked wristbands, a belt chain, dark trousers and boots; a drinking horn. Bronze and orange energy.
- **The Buzzsaw:** bald; browline glasses with a glowing blue rim and blue-tinted lenses; a short beard greying at the chin; slim; a fitted white tech T-shirt with glowing blue and orange trim, jeans with reinforced panels, a smartwatch. Blue and orange energy.
- **The Torque Warden:** a black fedora; a big, squared-off full beard; heavy-set; a long black coat with silver trim; a steely stare from under the brim. Silver energy and sparks.
- **The Stancemancer:** blond, clean-shaven, black rectangular glasses; a dark blue tech jumper with glowing purple and blue seams and a high collar; a smartwatch. Purple and blue energy that ripples like water.
- **The Cheatseeker:** short, neat dark hair, ginger stubble, a round face, stocky; a navy tech jacket with glowing red and blue trim over a red top; a thick blue rule book with metal corners (no lettering). Red and blue energy.
- **The Joyzerker:** heavy-set; a full ginger-auburn beard, swept-back wavy dark auburn hair; a sleeveless bright green top with black trim; a big, warm laugh. Green energy with a faint purple glitch at its edges.
- **The Fairy Dancer:** fair; a long oval face, round cheeks, a high receding hairline, light stubble, blue eyes; slim; a holographic pink, purple and white camo jacket over a black butterfly T-shirt, black strapped trousers, fingerless gloves. Pink sparkles and iridescent fairy-wing energy.
- **The Beanblader:** a long narrow face, short dark brown hair, a short ginger-auburn beard, slim; a crimson tech-monk robe with glowing bronze trim over a cream undershirt, big wooden prayer beads; floating beans; serene. Bronze and crimson energy.
- **The Pugilist:** short dark hair and a beard; purple wraparound shades; black and red tech gear; padded fingerless boxing gloves with the launcher strapped to one. A joyful brawler's grin. Red and orange energy.
- **The Beyby:** small and quick; a brown bowl cut; a tech face mask with a glowing pink and blue ring; a black and pink hooded tech jacket with white sleeves. Pink and purple energy.

## Prompts

Each one starts: "Please generate a new image. [Attachments, numbered, each
with what it's for.]" then the scene style block, then the fighters' lines,
then the scene below.

**E1, the eight at dawn** (attach B1, the sheet). Edit of B1: keep the arena
exactly. The eight walk up the steps onto the stage from the camera side,
seen from behind and low, in a loose line, backlit by the sunrise so they're
mostly dark shapes with bright rim light; each turned enough to show a
three-quarter profile. Their outfits and colours must match the sheet. Long
shadows towards the camera. Leave the sky and sun clear.

**P1, the first final** (attach B1, breycist, underdogger, Pugilist face).
The two face each other across the stadium bowl at dawn, mid-launch, seen
side-on from low at the stadium's edge: the Underdogger on the left, horn
raised in a toast, launching; the Breycist on the right, his no-look launch,
smirking. Their Beyblades streak towards each other, red-and-white and
bronze-and-orange. B1's arena behind, golden morning light. Both faces clearly
visible.

**S1, one stood over all** (attach B1, the sheet, breycist, Pugilist face).
The Breycist stands tall on the stadium rim in B1's arena, low angle, a
cocky smirk, launcher at his side, red energy rising round him. Around the
stadium below, the other seven are beaten: kneeling, slumped against the rim,
one on his back, faces down or turned away, their energy fading to grey
wisps. Morning light, the sun behind him like a halo.

**W1, new challengers** (attach B2, fairydancer, beanblader). Edit of B2: keep
the arena exactly. The Fairy Dancer and the Beanblader walk in through the
blizzard towards the camera, side by side, mid-stride, coats and robe blown
by the wind, their energy glowing warm against the snow (pink sparkles; bronze
beans). Determined, confident faces, clearly visible, in the middle third.

**P2, the Winter League final** (attach R2, breycist, buzzsaw, Pugilist face).
Replaced on 2026-11-04: the end of the fight, not the middle. In R2's frozen
arena, snow falling: the Buzzsaw on the right, close to the camera, on both
knees, arched back, fists clenched, screaming at the sky, his energy fading to
grey wisps; his Beyblade shattered into separate blue, orange and silver pieces
on the ice in the middle, with a few sparks and a curl of smoke; the Breycist
on the left, on the stadium rim above him, a smug smirk, catching his own
Beyblade. Both faces visible. The two faces and the Bey are too far apart for
one 16:9 frame, so the camera tilts from the Bey up to the men.

**G1, G2, G3: the 2026 field** (attach B3, the three or two fighters, Pugilist
face). On B3's night stage, crowd and spotlights behind, the fighters stand
side by side, waist up, slightly low angle, launchers raised and ready, each
with their own energy flaring. Confident, each in character. Faces clearly
visible, in the middle third. G1: Buzzsaw, Underdogger, Torque Warden. G2:
Stancemancer, Cheatseeker, Joyzerker. G3: Fairy Dancer, Beanblader.

**N1, the new blood** (attach B3, pugilist, beyby, breycist). On B3's night
stage, a face-off across the stadium: the Pugilist and the Beyby on the left,
close to the camera, seen over the shoulder and three-quarter, launchers
raised at the Breycist; the Breycist on the right, further back, arms
crossed, an amused smirk, red light round him. All three faces visible.
