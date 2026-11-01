# The Joyzerker: prompts

Redesign of the Gemini original, 2026-10-28. **Approved: `approved/joyzerker.png`**
(a copy of `candidates/joyzerker-F-transparent.png`). 1536×1024, transparent, face
found at 0.89. Not yet in the app.

## Attachments (new chat)

From `reference-photos/joyzerker/upload/`: `1b-style-pugilist-face.png`,
`1-style-pugilist.png`, and three photos of Vhar cropped to him alone
(`2-photo-front-smile.jpg`, `3-photo-laugh.jpg`, `4-photo-front.jpg`). No pose
reference, since there was no earlier approved version.

## Versions

| Version | How | Result |
|---|---|---|
| A | New chat: style block + likeness text + arms-wide launch pose | Good face and style, but fell back to the fist-at-camera lunge |
| B | Edit of A: "NOT a fist toward the camera… both arms flung wide" | Right pose; the user said the face was "too real, like a filter", and it was missing his joy/rage split |
| C | Edit of B: more stylised + split face, following the user's poster | Split face worked, but only on the face and not centred |
| D | Edit of C: split centred, continued down the whole body | Clothes still mostly black |
| E1, E2 | Edit of D: green/purple as the dominant colour of each half | E1 picked; **both had a grey checkerboard painted in** (RGB, no alpha) |
| F | Remove BG on E1 | **Approved**: same picture, real transparency |

## What worked

- **Split face and body, from the user's poster** (`5-concept-poster.jpg`). Ask for:
  the split "exactly down the vertical centre line: between the eyes, down the
  middle of the nose, mouth and beard", continued "through the neck, the middle of
  the T-shirt and down between the legs". Name what goes on each side.
- **Dominant colours:** "mainly bright green (several shades), black only as trim,
  seams and shadow"; the same for purple.
- **A pose fix by negation:** "must NOT be a fist punched toward the camera" plus a
  concrete description of where each hand is in the frame.

## Lessons

- Without a pose reference, ChatGPT reaches for the fist-at-camera lunge. Say no to
  it explicitly in the first prompt.
- Photos give a strong likeness on the first try; the face then needs pushing toward
  anime ("bigger expressive eyes, simplified nose and mouth, bold clumps").
- After any edit, check the file for real alpha: a grey checkerboard can be painted in.

## Victory images (2026-10-28): approved

Same recipe as the Breycist: a new chat with the old victory image (scene template),
`approved/joyzerker.png` (character) and the Pugilist head close-up (rendering). The
prompt spelled out the split (centre line, which colour and eye goes on each half)
and asked for the big screens to show the split face too.

- **Belt (`approved/victory-joyzerker.png`):** first try. The arms stayed rather
  muscular from the old template.
- **Royale (`approved/royale-victory-joyzerker.png`):** first try, with "heavy-set,
  thick arms, no visible veins". The split stops at the waist (plain black trousers)
  and the purple-side arm isn't shaded purple; the user accepted it.

The attachments were sent once without a prompt; that's harmless, since the prompt
can follow as the next message ("the three images above, in order…").

## Glitch animation (2026-10-31 to 11-01): candidate built, awaiting approval

The split image is replaced by a small animated WebP for the web app. Two full-body
frames, one all green ("good") and one all purple ("evil"), with a glitch switching
between them: about 60% of the loop on green, 40% on purple. Changes from the
approved image: a softer, kinder face on the green side; a sleeveless top; a little
slimmer around the middle. The victory images get the same treatment once this is
locked.

The purple frame is an edit of the green result in the same chat, so the two line up
for a clean switch. Any small drift gets aligned in code.

### G: green frame (new chat)

Attach, in order: `approved/joyzerker.png`, `reference-photos/joyzerker/upload/1b-style-pugilist-face.png`,
`reference-photos/joyzerker/upload/2-photo-front-smile.jpg`.

> Image 1 is my character, the Joyzerker. Image 2 shows the rendering style I want
> for the face (confident ink lines, crisp cel shading). Image 3 is the real person
> he is based on, smiling.
>
> Redraw image 1 as the same character with the same pose, the same camera angle, the
> same framing and the same landscape canvas (1536×1024), with these changes:
>
> 1. No split. His whole body is the good side: both eyes blue, natural fair skin
>    with ruddy pink cheeks across the whole face, and the whole outfit mainly bright
>    green (several shades), with black only as trim, seams and shadow. The energy
>    trails, sparks and Beyblade glow are all green, with white-hot highlights.
> 2. A softer, kinder face: warm, gentle eyes with relaxed brows and a slight crinkle
>    at the corners (like image 3), and a big, kind smile showing his upper teeth
>    through the beard. Happy and friendly, not wild, not shouting, the mouth not wide
>    open.
> 3. Sleeveless: the green top becomes a sleeveless athletic top cut at the shoulders,
>    so both arms are bare from the shoulder down. Thick, strong arms on a heavy-set
>    man, not a bodybuilder, no visible veins.
> 4. A little slimmer around the middle: still large and heavy-set with broad shoulders
>    and chest, but a bit less bulk around the stomach and waist.
>
> Keep: his ginger-red beard and swept-back auburn hair, both arms flung wide, the
> launcher and the ripcord in exactly the same hands and positions, the Beyblade spin
> vortex in the same place, and the same ink line art and cel shading.
>
> Transparent background (real transparency, not a painted checkerboard).

### P: purple frame (same chat, straight after G)

> Now make the evil version of this exact image. Keep everything exactly where it is:
> the pose, the outline, the hands, the launcher and ripcord, the hair and beard
> shapes, the sleeveless top, the positions of the Beyblade and the energy, and the
> canvas size. Change only these:
>
> 1. Face: a manic, snarling grin with bared, clenched teeth, deeply furrowed angry
>    brows, and both eyes glowing red. Same face shape, beard and hair.
> 2. Skin: shaded purple (cool violet shadows across the face and arms), like the
>    purple half of the first image I sent. The hair and beard stay ginger-red, with
>    darker, purple-tinted shadows.
> 3. Outfit: mainly vivid purple (several shades), with black only as trim, seams and
>    shadow.
> 4. Energy trails, sparks and Beyblade glow: purple and magenta, with white-hot
>    highlights.
>
> Transparent background (real transparency, not a painted checkerboard).

Save the results as `candidates/joyzerker-G-green.png` and `candidates/joyzerker-P-purple.png`.

### What happened

- **G and P** were run by the user in ChatGPT (with a "revert the head to the exact
  position" fix and background-removal passes). Both have real alpha, and the
  outlines overlap by 97% with no offset, so no alignment was needed.
- **Hair too ginger.** The user wanted it darker brown with a hint of red, and the
  beard deepened too. Done in code, not ChatGPT, so the frames stay aligned:
  `tools/recolour_joyzerker_hair.py` gives `candidates/joyzerker-G2-green-hair.png`
  and `candidates/joyzerker-P2-purple-hair.png`.
- **Animation:** `tools/glitch_animation.py` gives `candidates/joyzerker-glitch-A.webp`:
  1536x1024, 5 s loop, 3.0 s green (with a brief flicker of purple partway) and
  2.0 s purple, 6-frame glitch switches (band jolts, RGB split, scanlines), ~10 MB.
  The app runs locally only, so size isn't a concern.

### Lessons

- Ask for the purple frame as an edit of the green one: the frames came back aligned.
- Colour fixes on aligned frames are safer in code than as another ChatGPT edit.
- WebP size: keep glitch effects inside the jolted bands (the encoder stores only what
  changed), and use method 4. Method 6 took nearly 6 minutes for the same frames.
